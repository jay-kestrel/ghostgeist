/**
 * GhostGeist Jira REST API Service
 * Creates Jira issues, queries project context, and attaches GitHub remote links using @forge/api.
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
 * Fetches Jira project context including valid issue types and recent issues
 * for duplicate/orphan detection and AI prompt grounding.
 * Fail gracefully returning default fallback if any call fails or in test environments.
 *
 * @param {string} projectKey - Project key (e.g. 'PROJ')
 * @returns {Promise<{ validIssueTypes: string[], recentIssues: Array<{ key: string, summary: string, issueType: string, status: string }> }>}
 */
export async function fetchProjectContext(projectKey) {
  const defaultContext = {
    validIssueTypes: ['Task', 'Bug', 'Story'],
    recentIssues: []
  };

  if (!projectKey || typeof projectKey !== 'string' || projectKey.trim().length === 0) {
    return defaultContext;
  }

  try {
    const cleanProjectKey = projectKey.trim().toUpperCase();
    let validIssueTypes = ['Task', 'Bug', 'Story'];
    let recentIssues = [];

    // (a) Project details & valid issue types
    try {
      let projectRes;
      if (api?.asUser) {
        try {
          projectRes = await api.asUser().requestJira(route`/rest/api/3/project/${cleanProjectKey}`);
        } catch (err) {
          console.warn(`fetchProjectContext: api.asUser() failed for project details: ${err.message}`);
        }
      }

      if (!projectRes || !projectRes.ok) {
        if (api?.asApp) {
          try {
            projectRes = await api.asApp().requestJira(route`/rest/api/3/project/${cleanProjectKey}`);
          } catch (err) {
            console.warn(`fetchProjectContext: api.asApp() fallback failed for project details: ${err.message}`);
          }
        }
      }

      if (projectRes && projectRes.ok) {
        const projectData = await projectRes.json();
        if (Array.isArray(projectData?.issueTypes) && projectData.issueTypes.length > 0) {
          const types = projectData.issueTypes
            .filter((t) => t && !t.subtask && t.name)
            .map((t) => t.name.trim())
            .filter(Boolean);

          if (types.length > 0) {
            validIssueTypes = [...new Set(types)];
          }
        }
      }
    } catch (err) {
      console.warn(`fetchProjectContext: Error extracting issue types: ${err.message}`);
    }

    // (b) Recent project issues for duplicate/orphan detection
    try {
      const jql = `project = "${cleanProjectKey}" ORDER BY created DESC`;
      let searchRes;
      if (api?.asUser) {
        try {
          searchRes = await api.asUser().requestJira(
            route`/rest/api/3/search?jql=${jql}&maxResults=15&fields=summary,issuetype,status`
          );
        } catch (err) {
          console.warn(`fetchProjectContext: api.asUser() failed for recent issues: ${err.message}`);
        }
      }

      if (!searchRes || !searchRes.ok) {
        if (api?.asApp) {
          try {
            searchRes = await api.asApp().requestJira(
              route`/rest/api/3/search?jql=${jql}&maxResults=15&fields=summary,issuetype,status`
            );
          } catch (err) {
            console.warn(`fetchProjectContext: api.asApp() fallback failed for recent issues: ${err.message}`);
          }
        }
      }

      if (searchRes && searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData?.issues)) {
          recentIssues = searchData.issues.map((i) => ({
            key: i.key,
            summary: i.fields?.summary || '',
            issueType: i.fields?.issuetype?.name || '',
            status: i.fields?.status?.name || ''
          }));
        }
      }
    } catch (err) {
      console.warn(`fetchProjectContext: Error extracting recent issues: ${err.message}`);
    }

    return {
      validIssueTypes,
      recentIssues
    };
  } catch (err) {
    console.warn(`fetchProjectContext failed gracefully: ${err.message}`);
    return defaultContext;
  }
}

/**
 * Attaches a remote GitHub link to an existing Jira issue.
 * Inverts Jira call order: attempts api.asUser() first, falling back to api.asApp().
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
    let response;
    if (api?.asUser) {
      try {
        response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKeyOrId}/remotelink`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn(`api.asUser() request failed, attempting api.asApp(): ${err.message}`);
      }
    }

    if (!response || !response.ok) {
      if (api?.asApp) {
        try {
          response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKeyOrId}/remotelink`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        } catch (err) {
          console.warn(`api.asApp() fallback failed: ${err.message}`);
        }
      }
    }

    if (!response || !response.ok) {
      const err = response ? await response.text() : 'No response from Jira API';
      console.warn(`Remote link warning (${response ? response.status : 500}): ${err}`);
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
 * Attempts api.asUser() first, falling back to api.asApp().
 * Validates issueType against validIssueTypes if provided.
 */
export async function createJiraIssue({
  projectKey,
  summary,
  description,
  issueType = 'Task',
  validIssueTypes,
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

  // Validate issueType against validIssueTypes if provided
  let selectedIssueType = issueType || 'Task';
  if (Array.isArray(validIssueTypes) && validIssueTypes.length > 0) {
    if (!validIssueTypes.includes(selectedIssueType)) {
      selectedIssueType = validIssueTypes[0];
    }
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
        name: selectedIssueType
      }
    }
  };

  let response;
  if (api?.asUser) {
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
      console.warn(`api.asUser() request failed, attempting api.asApp(): ${err.message}`);
    }
  }

  if (!response || !response.ok) {
    if (api?.asApp) {
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
        console.warn(`api.asApp() fallback failed: ${err.message}`);
      }
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
