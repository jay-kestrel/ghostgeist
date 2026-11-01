/**
 * GhostGeist GitHub Service
 * Interacts with GitHub REST API to fetch pull requests and detect untracked work.
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
 * Checks title, head branch ref, and body description.
 *
 * @param {Object} pr - The GitHub PR object
 * @param {string} [targetProjectKey] - Optional target Jira project key (e.g. 'GHOST')
 * @returns {{ isUntracked: boolean, matchedKey: string | null }}
 */
export function analyzePRTracking(pr, targetProjectKey) {
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
