/**
 * GhostGeist Backend Resolvers
 * Bridges the UI Kit frontend with GitHub, Jira, and Gemini AI services.
 */
import Resolver from '@forge/resolver';
import { getAppConfig, saveAppConfig } from '../services/config';
import { fetchPullRequests, fetchPullRequestFiles, analyzePRTracking } from '../services/github';
import { triagePRWithGemini } from '../services/gemini';
import { createJiraIssue } from '../services/jira';

const resolver = new Resolver();

/**
 * Resolver: getConfig
 * Returns current GhostGeist repository and API configuration.
 */
resolver.define('getConfig', async () => {
  const config = await getAppConfig();
  return {
    owner: config.owner,
    repo: config.repo,
    hasGithubToken: Boolean(config.githubToken),
    hasGeminiApiKey: Boolean(config.geminiApiKey),
    isConfigured: Boolean(config.owner && config.repo)
  };
});

/**
 * Resolver: saveConfig
 * Persists updated GitHub repo settings and API tokens.
 */
resolver.define('saveConfig', async (req) => {
  const { payload } = req;
  const updated = await saveAppConfig({
    owner: payload?.owner,
    repo: payload?.repo,
    githubToken: payload?.githubToken,
    geminiApiKey: payload?.geminiApiKey
  });

  return {
    success: true,
    config: {
      owner: updated.owner,
      repo: updated.repo,
      hasGithubToken: Boolean(updated.githubToken),
      hasGeminiApiKey: Boolean(updated.geminiApiKey),
      isConfigured: Boolean(updated.owner && updated.repo)
    }
  };
});

/**
 * Resolver: scanUntrackedPRs
 * Scans open GitHub PRs and detects untracked shadow work.
 * Triage is performed on-demand per PR to avoid Forge 25s execution timeouts.
 */
resolver.define('scanUntrackedPRs', async (req) => {
  const { payload, context } = req;
  const config = await getAppConfig();

  const owner = payload?.owner || config.owner;
  const repo = payload?.repo || config.repo;
  const token = config.githubToken;
  const projectKey = payload?.projectKey || context?.extension?.project?.key || '';

  if (!owner || !repo) {
    throw new Error('Please configure the GitHub Owner and Repository in Settings before scanning.');
  }

  const allPRs = await fetchPullRequests({ owner, repo, token, state: 'open' });

  const untrackedPRs = [];
  let trackedCount = 0;

  for (const pr of allPRs) {
    const analysis = analyzePRTracking(pr, projectKey);
    if (analysis.isUntracked) {
      untrackedPRs.push({
        ...pr,
        tracking: analysis,
        triage: null
      });
    } else {
      trackedCount++;
    }
  }

  return {
    success: true,
    prs: untrackedPRs,
    stats: {
      totalCount: allPRs.length,
      untrackedCount: untrackedPRs.length,
      trackedCount,
      totalShadowPoints: 0
    }
  };
});

/**
 * Resolver: triageSinglePR
 * On-demand Gemini triage for a specific PR with diff context.
 */
resolver.define('triageSinglePR', async (req) => {
  const { payload } = req;
  const config = await getAppConfig();

  const pr = payload?.pr;
  if (!pr) {
    throw new Error('PR details are required for triage');
  }

  const owner = payload?.owner || config.owner;
  const repo = payload?.repo || config.repo;
  const token = config.githubToken;
  const geminiApiKey = config.geminiApiKey;

  if (!geminiApiKey) {
    throw new Error('Gemini API key is not configured. Please set your Gemini API key in Settings.');
  }

  // Fetch file diff for deeper analysis
  let diffSummary = '';
  if (owner && repo && pr.number) {
    try {
      const filesResult = await fetchPullRequestFiles({
        owner,
        repo,
        token,
        prNumber: pr.number
      });
      diffSummary = filesResult.summary;
    } catch (err) {
      console.warn(`Could not load files for PR #${pr.number}: ${err.message}`);
    }
  }

  const triage = await triagePRWithGemini(pr, geminiApiKey, diffSummary);

  return {
    success: true,
    triage
  };
});

/**
 * Resolver: createJiraIssue
 * Creates a Jira issue from PR metadata and links the GitHub PR.
 */
resolver.define('createJiraIssue', async (req) => {
  const { payload, context } = req;
  const projectKey = payload.projectKey || context?.extension?.project?.key;

  if (!projectKey) {
    throw new Error('Jira project key could not be determined. Please specify a target project.');
  }

  const issueResult = await createJiraIssue({
    projectKey,
    summary: payload.summary,
    description: payload.description,
    issueType: payload.issueType || 'Task',
    prUrl: payload.prUrl,
    prNumber: payload.prNumber,
    author: payload.author,
    estimatedPoints: payload.estimatedPoints,
    reason: payload.reason
  });

  return {
    success: true,
    issue: issueResult
  };
});

export const handler = resolver.getDefinitions();
