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
 * Builds the prompt string from PR metadata and diff summary.
 */
function buildPrompt(pr, diffSummary) {
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

  return prompt;
}

/**
 * Calls Gemini endpoint with a specific model.
 */
async function callGeminiEndpoint(modelName, apiKey, promptText, customFetch = null) {
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
      responseSchema: JSON_SCHEMA,
      temperature: 0.2
    }
  };

  const response = await fetchClient(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

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
 * @returns {Promise<{ suggestedTitle: string, suggestedDescription: string, issueType: string, estimatedStoryPoints: number, reason: string }>}
 */
export async function triagePRWithGemini(pr, apiKey, diffSummary = '', customFetch = null) {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Gemini API Key is not configured. Please enter your Gemini API key in Settings.');
  }

  const promptText = buildPrompt(pr, diffSummary);
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

  let lastError = null;
  for (const model of models) {
    try {
      const triageResult = await callGeminiEndpoint(model, apiKey.trim(), promptText, customFetch);
      return {
        suggestedTitle: triageResult.suggestedTitle || pr.title || 'Untitled Task',
        suggestedDescription: triageResult.suggestedDescription || pr.body || 'No description generated.',
        issueType: ['Task', 'Bug', 'Story'].includes(triageResult.issueType) ? triageResult.issueType : 'Task',
        estimatedStoryPoints: Number(triageResult.estimatedStoryPoints) || 2,
        reason: triageResult.reason || 'Synthesized from Pull Request analysis.'
      };
    } catch (err) {
      console.warn(`Model ${model} failed, trying next fallback: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed');
}
