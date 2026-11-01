/**
 * GhostGeist Jira REST API Service
 * Creates Jira issues and attaches GitHub remote links using @forge/api.
 */
import api, { route } from '@forge/api';

/**
 * Generates valid Atlassian Document Format (ADF) from text and PR metadata.
 */
export function buildAdfDescription(text, prUrl, prNumber, author, estimatedPoints, reason) {
  const rawText = typeof text === 'string' ? text : '';
  const paragraphs = rawText.split('\n\n').filter((p) => p.trim().length > 0);

  const content = [];

  // Summary paragraphs
  for (const p of paragraphs) {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: p.trim()
        }
      ]
    });
  }

  // PR Context Block
  if (prUrl && typeof prUrl === 'string' && prUrl.trim().length > 0) {
    const prParagraphContent = [
      {
        type: 'text',
        text: 'Source Pull Request: ',
        marks: [{ type: 'strong' }]
      },
      {
        type: 'text',
        text: `#${prNumber || ''} on GitHub`,
        marks: [
          {
            type: 'link',
            attrs: { href: prUrl.trim() }
          }
        ]
      }
    ];

    if (author && typeof author === 'string' && author.trim().length > 0) {
      prParagraphContent.push({
        type: 'text',
        text: ` (Opened by @${author.trim()})`
      });
    }

    content.push({
      type: 'paragraph',
      content: prParagraphContent
    });
  }

  // Shadow Work AI Insights
  const pointsPart = estimatedPoints ? `Estimated ${estimatedPoints} Story Points.` : '';
  const reasonPart = reason && typeof reason === 'string' ? reason.trim() : '';
  const analysisParts = [pointsPart, reasonPart].filter(Boolean);

  if (analysisParts.length > 0) {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'GhostGeist Shadow Work Analysis: ',
          marks: [{ type: 'strong' }]
        },
        {
          type: 'text',
          text: analysisParts.join(' ')
        }
      ]
    });
  }

  return {
    version: 1,
    type: 'doc',
    content: content.length > 0 ? content : [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Reconciled from GitHub Pull Request by GhostGeist.'
          }
        ]
      }
    ]
  };
}

/**
 * Attaches a remote GitHub link to an existing Jira issue.
 */
export async function attachRemoteLink({ issueKeyOrId, url, title }) {
  if (!issueKeyOrId || !url) {
    return false;
  }

  const payload = {
    relationship: 'links to',
    object: {
      url: url,
      title: title || 'GitHub Pull Request',
      icon: {
        url16x16: 'https://github.githubassets.com/favicons/favicon.svg',
        title: 'GitHub'
      }
    }
  };

  try {
    let response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKeyOrId}/remotelink`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok && api.asUser) {
      // Fallback to asUser if asApp is restricted
      response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKeyOrId}/remotelink`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      const err = await response.text();
      console.warn(`Remote link warning (${response.status}): ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`Failed to attach remote link: ${err.message}`);
    return false;
  }
}

/**
 * Creates a Jira issue with ADF formatting and links the source PR.
 */
export async function createJiraIssue({
  projectKey,
  summary,
  description,
  issueType = 'Task',
  prUrl,
  prNumber,
  author,
  estimatedPoints,
  reason
}) {
  if (!projectKey || projectKey.trim().length === 0) {
    throw new Error('Project key is required to create a Jira issue');
  }

  if (!summary || summary.trim().length === 0) {
    throw new Error('Issue summary/title is required');
  }

  const adfDescription = buildAdfDescription(
    description,
    prUrl,
    prNumber,
    author,
    estimatedPoints,
    reason
  );

  const payload = {
    fields: {
      project: {
        key: projectKey.trim().toUpperCase()
      },
      summary: summary.trim(),
      description: adfDescription,
      issuetype: {
        name: issueType || 'Task'
      }
    }
  };

  let response;
  try {
    response = await api.asApp().requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn(`api.asApp() request failed, attempting api.asUser(): ${err.message}`);
  }

  if (!response || !response.ok) {
    // Attempt fallback to asUser
    try {
      response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Keep previous error or report
    }
  }

  if (!response || !response.ok) {
    const errorBody = response ? await response.text() : 'No response from Jira API';
    throw new Error(`Failed to create Jira issue (${response ? response.status : 500}): ${errorBody}`);
  }

  const issueData = await response.json();

  if (prUrl) {
    await attachRemoteLink({
      issueKeyOrId: issueData.key,
      url: prUrl,
      title: `GitHub PR #${prNumber || ''}: ${summary}`
    });
  }

  return {
    id: issueData.id,
    key: issueData.key,
    self: issueData.self
  };
}
