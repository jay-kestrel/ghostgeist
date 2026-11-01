/**
 * GhostGeist GitHub Service
 * Interacts with GitHub REST API to fetch pull requests, detect untracked work,
 * and perform bi-directional write-back to GitHub PRs.
 */
import { fetch as forgeFetch } from '@forge/api';

const getFetch = () => {
  if (typeof forgeFetch === 'function') {
    return forgeFetch;
  }
  return globalThis.fetch;
};

/**
 * Builds standard GitHub API headers.
 */
function buildHeaders(token) {
  const headers = {
    'User-Agent': 'GhostGeist-Forge-App',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (token && token.trim().length > 0) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  return headers;
}

/**
 * Detects whether a PR is linked to a Jira issue key.
 * Checks reconciledMap ledger first, then title, head branch ref, and body description.
 *
 * @param {Object} pr - The GitHub PR object
 * @param {string} [targetProjectKey] - Optional target Jira project key (e.g. 'GHOST')
 * @param {Array|Map|Object} [reconciledMap=null] - Reconciled PR ledger or mapping
 * @returns {{ isUntracked: boolean, matchedKey: string | null }}
 */
export function analyzePRTracking(pr, targetProjectKey, reconciledMap = null) {
  if (reconciledMap && pr && pr.number != null) {
    const prNum = Number(pr.number);
    let match = null;

    if (Array.isArray(reconciledMap)) {
      match = reconciledMap.find((item) => Number(item?.prNumber) === prNum);
    } else if (reconciledMap instanceof Map) {
      let prOwner = pr.owner || pr.base?.repo?.owner?.login || '';
      let prRepo = pr.repo || pr.base?.repo?.name || '';
      if ((!prOwner || !prRepo) && typeof pr.html_url === 'string') {
        const matchUrl = pr.html_url.match(/github\.com\/([^/]+)\/([^/]+)\/pull/i);
        if (matchUrl) {
          prOwner = prOwner || matchUrl[1];
          prRepo = prRepo || matchUrl[2];
        }
      }

      const candidateKeys = [];
      if (prOwner && prRepo) {
        candidateKeys.push(`${prOwner}/${prRepo}#${prNum}`);
        candidateKeys.push(`${prOwner.toLowerCase()}/${prRepo.toLowerCase()}#${prNum}`);
      }
      candidateKeys.push(`#${prNum}`);
      candidateKeys.push(`${prNum}`);
      candidateKeys.push(prNum);

      for (const k of candidateKeys) {
        if (reconciledMap.has(k)) {
          match = reconciledMap.get(k);
          break;
        }
      }

      if (!match) {
        for (const [key, value] of reconciledMap.entries()) {
          const strKey = String(key);
          if (strKey === `${prNum}` || strKey === `#${prNum}` || strKey.endsWith(`#${prNum}`)) {
            match = value;
            break;
          }
        }
      }
    } else if (typeof reconciledMap === 'object') {
      let prOwner = pr.owner || pr.base?.repo?.owner?.login || '';
      let prRepo = pr.repo || pr.base?.repo?.name || '';
      if ((!prOwner || !prRepo) && typeof pr.html_url === 'string') {
        const matchUrl = pr.html_url.match(/github\.com\/([^/]+)\/([^/]+)\/pull/i);
        if (matchUrl) {
          prOwner = prOwner || matchUrl[1];
          prRepo = prRepo || matchUrl[2];
        }
      }

      const candidateKeys = [];
      if (prOwner && prRepo) {
        candidateKeys.push(`${prOwner}/${prRepo}#${prNum}`);
        candidateKeys.push(`${prOwner.toLowerCase()}/${prRepo.toLowerCase()}#${prNum}`);
      }
      candidateKeys.push(`#${prNum}`);
      candidateKeys.push(`${prNum}`);

      for (const k of candidateKeys) {
        if (Object.prototype.hasOwnProperty.call(reconciledMap, k) && reconciledMap[k] !== undefined) {
          match = reconciledMap[k];
          break;
        }
      }

      if (!match) {
        for (const [key, value] of Object.entries(reconciledMap)) {
          const strKey = String(key);
          if (strKey === `${prNum}` || strKey === `#${prNum}` || strKey.endsWith(`#${prNum}`)) {
            match = value;
            break;
          }
        }
      }
    }

    if (match) {
      const rawKey = (match && (match.issueKey || match.key)) || match;
      if (rawKey) {
        return {
          isUntracked: false,
          matchedKey: String(rawKey).toUpperCase()
        };
      }
    }
  }

  const genericJiraPattern = /\b([A-Za-z][A-Za-z0-9]+-\d+)\b/i;
  const targetPattern = (targetProjectKey && targetProjectKey.trim().length > 0)
    ? new RegExp(`\\b(${targetProjectKey.trim()}-\\d+)\\b`, 'i')
    : null;

  const title = pr?.title || '';
  const branch = pr?.head?.ref || '';
  const body = pr?.body || '';

  // Check for ANY valid Jira issue key across title, branch, and body
  const genericMatch = title.match(genericJiraPattern) || branch.match(genericJiraPattern) || body.match(genericJiraPattern);

  if (!genericMatch) {
    return {
      isUntracked: true,
      matchedKey: null
    };
  }

  // PR is tracked under a valid Jira project key!
  // If targetProjectKey was provided, check if it specifically references that project
  let matchedKey = genericMatch[1];
  if (targetPattern) {
    const targetMatch = title.match(targetPattern) || branch.match(targetPattern) || body.match(targetPattern);
    if (targetMatch) {
      matchedKey = targetMatch[1];
    }
  }

  return {
    isUntracked: false,
    matchedKey: matchedKey.toUpperCase()
  };
}

/**
 * Updates a GitHub Pull Request title and body to reference a newly created Jira issue.
 * Performs a bi-directional write-back if token has repository write permissions.
 *
 * @param {Object} params
 * @param {string} params.owner
 * @param {string} params.repo
 * @param {string} params.token
 * @param {number|string} params.prNumber
 * @param {string} params.issueKey
 * @param {string} [params.issueUrl]
 * @param {string} [params.currentTitle]
 * @param {string} [params.currentBody]
 * @returns {Promise<boolean>} True if update succeeded, false otherwise
 */
export async function updatePullRequestWithIssue({
  owner,
  repo,
  token,
  prNumber,
  issueKey,
  issueUrl,
  currentTitle,
  currentBody,
  customFetch
} = {}) {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return false;
  }
  if (!owner || !repo || !prNumber || !issueKey) {
    return false;
  }

  const cleanIssueKey = String(issueKey).trim().toUpperCase();
  if (!cleanIssueKey) {
    return false;
  }

  const titleStr = typeof currentTitle === 'string' ? currentTitle : '';
  const bodyStr = typeof currentBody === 'string' ? currentBody : '';

  // Determine updated title:
  // If currentTitle already contains issueKey (e.g. [KEY] or includes KEY), keep currentTitle.
  // Otherwise: `[${issueKey}] ${currentTitle || `PR #${prNumber}`}`
  let updatedTitle = titleStr;
  if (!titleStr.toUpperCase().includes(cleanIssueKey)) {
    updatedTitle = `[${cleanIssueKey}] ${titleStr || `PR #${prNumber}`}`;
  }

  // Determine updated body:
  const trackedText = `\n\n---\n**Tracked in Jira:** [${cleanIssueKey}](${issueUrl || ''})`;
  let updatedBody = bodyStr;
  if (!bodyStr.toUpperCase().includes(cleanIssueKey) && !bodyStr.includes(trackedText)) {
    updatedBody = `${bodyStr}${trackedText}`;
  }

  try {
    const fetchClient = customFetch || getFetch();
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`;

    const headers = buildHeaders(token);
    headers['Content-Type'] = 'application/json';

    const response = await fetchClient(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        title: updatedTitle,
        body: updatedBody
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Could not update GitHub PR #${prNumber} with Jira link (${response.status}): ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`Exception updating GitHub PR #${prNumber} with Jira link:`, err.message);
    return false;
  }
}

/**
 * Fetches open pull requests for a given repository.
 */
export async function fetchPullRequests({ owner, repo, token, state = 'open' }) {
  if (!owner || !repo) {
    throw new Error('GitHub owner and repository name are required');
  }

  const fetchClient = getFetch();
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${encodeURIComponent(state)}&per_page=30`;

  const response = await fetchClient(url, {
    method: 'GET',
    headers: buildHeaders(token)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.message || errorText;
    } catch {
      // Keep raw message
    }
    throw new Error(`GitHub API error (${response.status}): ${message}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title || 'Untitled Pull Request',
    body: pr.body || '',
    html_url: pr.html_url,
    state: pr.state,
    user: {
      login: pr.user?.login || 'unknown',
      avatar_url: pr.user?.avatar_url || ''
    },
    head: {
      ref: pr.head?.ref || '',
      sha: pr.head?.sha || ''
    },
    base: {
      ref: pr.base?.ref || ''
    },
    created_at: pr.created_at,
    updated_at: pr.updated_at
  }));
}

/**
 * Fetches diff and modified files for a pull request.
 * Limits to the first 5 files and 500 lines total to avoid token explosion.
 */
export async function fetchPullRequestFiles({ owner, repo, token, prNumber }) {
  if (!owner || !repo || !prNumber) {
    throw new Error('GitHub owner, repository, and PR number are required');
  }

  const fetchClient = getFetch();
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/files?per_page=10`;

  try {
    const response = await fetchClient(url, {
      method: 'GET',
      headers: buildHeaders(token)
    });

    if (!response.ok) {
      console.warn(`Could not fetch PR files (${response.status})`);
      return { files: [], summary: 'No diff details available' };
    }

    const files = await response.json();
    if (!Array.isArray(files)) {
      return { files: [], summary: 'No diff details available' };
    }

    const topFiles = files.slice(0, 5);
    let totalLines = 0;
    const maxLines = 500;

    const fileSummaries = topFiles.map((file) => {
      let patch = file.patch || '';
      const lines = patch.split('\n');
      if (totalLines + lines.length > maxLines) {
        const remaining = Math.max(0, maxLines - totalLines);
        patch = lines.slice(0, remaining).join('\n') + '\n... [diff truncated for length]';
        totalLines = maxLines;
      } else {
        totalLines += lines.length;
      }

      return `File: ${file.filename} (+${file.additions}/-${file.deletions}, status: ${file.status})\n${patch}`;
    });

    return {
      files: topFiles.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions
      })),
      summary: fileSummaries.join('\n\n')
    };
  } catch (err) {
    console.warn(`Error fetching PR files: ${err.message}`);
    return { files: [], summary: 'Could not fetch diff details' };
  }
}

/**
 * Fetches a single PR by number.
 */
export async function fetchSinglePR({ owner, repo, token, prNumber }) {
  if (!owner || !repo || !prNumber) {
    throw new Error('GitHub owner, repository, and PR number are required');
  }

  const fetchClient = getFetch();
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`;

  const response = await fetchClient(url, {
    method: 'GET',
    headers: buildHeaders(token)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errText}`);
  }

  const pr = await response.json();
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title || 'Untitled Pull Request',
    body: pr.body || '',
    html_url: pr.html_url,
    state: pr.state,
    user: {
      login: pr.user?.login || 'unknown',
      avatar_url: pr.user?.avatar_url || ''
    },
    head: {
      ref: pr.head?.ref || '',
      sha: pr.head?.sha || ''
    },
    base: {
      ref: pr.base?.ref || ''
    },
    created_at: pr.created_at,
    updated_at: pr.updated_at
  };
}
