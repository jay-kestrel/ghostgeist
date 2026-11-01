/**
 * GhostGeist Gemini AI Service
 * Uses Google Gemini structured output to analyze untracked PRs and propose Jira tickets.
 */
import { fetch as forgeFetch } from '@forge/api';

const getFetch = () => {
  if (typeof forgeFetch === 'function') {
    return forgeFetch;
  }
  return globalThis.fetch;
};

const JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    suggestedTitle: {
      type: 'STRING',
      description: 'Concise, standardized Jira issue summary'
    },
    suggestedDescription: {
      type: 'STRING',
      description: 'Comprehensive issue description including context, root cause, and changes made'
    },
    issueType: {
      type: 'STRING',
      enum: ['Task', 'Bug', 'Story'],
      description: 'Appropriate Jira issue type'
    },
    estimatedStoryPoints: {
      type: 'INTEGER',
      description: 'Estimated Fibonacci story points (1, 2, 3, 5, 8)'
    },
    reason: {
      type: 'STRING',
      description: 'Rationale for the chosen issue type and point estimate'
    },
    matchedExistingIssueKey: {
      type: 'STRING',
      description: 'Jira issue key (e.g. GHOST-42) of an existing ticket if this PR duplicates or relates to it; otherwise empty string'
    }
  },
  required: [
    'suggestedTitle',
    'suggestedDescription',
    'issueType',
    'estimatedStoryPoints',
    'reason'
  ]
};

/**
 * Builds the prompt string from PR metadata, diff summary, and Jira project context.
 */
function buildPrompt(pr, diffSummary, jiraContext = null) {
  let prompt = `You are GhostGeist, an expert software architect and engineering lead embedded in Jira.
Analyze the following untracked GitHub Pull Request and synthesize a production-ready Jira issue.
Ensure the summary is clear and actionable, the description explains the technical problem and change,
and the story points reflect the true engineering scope (Fibonacci: 1, 2, 3, 5, 8).

PR Information:
- Number: #${pr.number}
- Title: ${pr.title || 'Untitled'}
- Author: ${pr.user?.login || 'unknown'}
- Source Branch: ${pr.head?.ref || 'unknown'} -> Target: ${pr.base?.ref || 'main'}
- State: ${pr.state || 'open'}

Pull Request Body:
${pr.body && pr.body.trim().length > 0 ? pr.body : '(No PR description provided)'}
`;

  if (diffSummary && diffSummary.trim().length > 0) {
    prompt += `\nCode Diff & Modified Files Summary:\n${diffSummary}\n`;
  }

  if (jiraContext) {
    const projectKey = jiraContext.projectKey || 'None';
    const validTypes = (Array.isArray(jiraContext.validIssueTypes) && jiraContext.validIssueTypes.length > 0)
      ? jiraContext.validIssueTypes
      : ['Task', 'Bug', 'Story'];

    let recentIssuesText = 'None available.';
    if (Array.isArray(jiraContext.recentIssues) && jiraContext.recentIssues.length > 0) {
      recentIssuesText = jiraContext.recentIssues
        .map((issue) => `- [${issue.key}] (${issue.issueType || 'Unknown'}, Status: ${issue.status || 'Unknown'}): ${issue.summary || 'No summary'}`)
        .join('\n');
    }

    prompt += `\nAtlassian Project Context ('Build with context. Ship with confidence.'):
Project Key: ${projectKey}
Valid Issue Types: ${validTypes.join(', ')}

Recent Project Issues (Check for potential duplicates or related work):
${recentIssuesText}

Ensure your proposed issueType is one of the valid issue types listed above.
Check the recent project issues. If this PR directly addresses, implements, or duplicates one of the recent issues, set matchedExistingIssueKey to that issue key (e.g. 'PROJ-123'). Otherwise, set matchedExistingIssueKey to an empty string.\n`;
  }

  return prompt;
}

/**
 * Calls Gemini endpoint with a specific model.
 */
async function callGeminiEndpoint(modelName, apiKey, promptText, customFetch = null, customSchema = null) {
  const fetchClient = customFetch || getFetch();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: customSchema || JSON_SCHEMA,
      temperature: 0.2
    }
  };

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

  let response;
  try {
    response = await fetchClient(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload),
      signal: controller?.signal
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned ${response.status} (${modelName}): ${errorText}`);
  }

  const result = await response.json();
  const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawJson) {
    throw new Error(`Empty content returned by Gemini (${modelName})`);
  }

  try {
    return JSON.parse(rawJson);
  } catch (err) {
    throw new Error(`Failed to parse Gemini JSON output: ${err.message}. Raw: ${rawJson}`);
  }
}

/**
 * Analyzes a pull request with Google Gemini.
 * Attempts gemini-3.8-flash first, falling back to gemini-3.5-flash and gemini-3.5-flash-lite.
 *
 * @param {Object} pr - GitHub PR object
 * @param {string} apiKey - Gemini API Key
 * @param {string} [diffSummary] - Optional file diff summary
 * @param {Function} [customFetch] - Optional custom fetch implementation
 * @param {Object} [jiraContext] - Optional Jira project context ({ projectKey, validIssueTypes, recentIssues })
 * @returns {Promise<{ suggestedTitle: string, suggestedDescription: string, issueType: string, estimatedStoryPoints: number, reason: string, matchedExistingIssueKey: string|null }>}
 */
export async function triagePRWithGemini(pr, apiKey, diffSummary = '', customFetch = null, jiraContext = null) {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Gemini API Key is not configured. Please enter your Gemini API key in Settings.');
  }

  const promptText = buildPrompt(pr, diffSummary, jiraContext);
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

  const validList = (Array.isArray(jiraContext?.validIssueTypes) && jiraContext.validIssueTypes.length > 0)
    ? [...new Set(jiraContext.validIssueTypes.filter((t) => typeof t === 'string' && t.trim().length > 0))]
    : ['Task', 'Bug', 'Story'];

  const effectiveValidList = validList.length > 0 ? validList : ['Task', 'Bug', 'Story'];

  const schema = {
    ...JSON_SCHEMA,
    properties: {
      ...JSON_SCHEMA.properties,
      issueType: {
        type: 'STRING',
        enum: effectiveValidList,
        description: 'Appropriate Jira issue type'
      }
    }
  };

  let lastError = null;
  for (const model of models) {
    try {
      const triageResult = await callGeminiEndpoint(model, apiKey.trim(), promptText, customFetch, schema);
      return {
        suggestedTitle: triageResult.suggestedTitle || pr.title || 'Untitled Task',
        suggestedDescription: triageResult.suggestedDescription || pr.body || 'No description generated.',
        issueType: effectiveValidList.includes(triageResult.issueType) ? triageResult.issueType : effectiveValidList[0],
        estimatedStoryPoints: Number(triageResult.estimatedStoryPoints) || 2,
        reason: triageResult.reason || 'Synthesized from Pull Request analysis.',
        matchedExistingIssueKey: triageResult.matchedExistingIssueKey || null
      };
    } catch (err) {
      console.warn(`Model ${model} failed, trying next fallback: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed');
}
