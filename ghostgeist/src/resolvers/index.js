/**
 * GhostGeist Backend Resolvers
 * Bridges the UI Kit frontend with GitHub, Jira, and Gemini AI services.
 */
import ResolverPackage from '@forge/resolver';
import {
  getAppConfig,
  saveAppConfig,
  getReconciledPRs,
  recordReconciledPR,
  getCachedTriage,
  setCachedTriage,
  checkAndIncrementDemoQuota,
  clearTriageCache,
  clearReconciledPRs
} from '../services/config.js';
import { fetchPullRequests, fetchPullRequestFiles, analyzePRTracking, updatePullRequestWithIssue } from '../services/github.js';
import { triagePRWithGemini } from '../services/gemini.js';
import { createJiraIssue, fetchProjectContext } from '../services/jira.js';

const Resolver = (typeof ResolverPackage === 'function')
  ? ResolverPackage
  : (typeof ResolverPackage?.default === 'function')
    ? ResolverPackage.default
    : (ResolverPackage?.default?.default || ResolverPackage);

const resolver = new Resolver();

/**
 * Resolver: getConfig
 * Returns current GhostGeist repository, API credentials, and built-in key status.
 */
resolver.define('getConfig', async () => {
  const config = await getAppConfig();
  return {
    owner: config.owner,
    repo: config.repo,
    hasGithubToken: Boolean(config.githubToken),
    hasGeminiApiKey: Boolean(config.geminiApiKey),
    usingBuiltInGeminiKey: Boolean(config.usingBuiltInGeminiKey),
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
      usingBuiltInGeminiKey: Boolean(updated.usingBuiltInGeminiKey),
      isConfigured: Boolean(updated.owner && updated.repo)
    }
  };
});

/**
 * Resolver: scanUntrackedPRs
 * Scans open GitHub PRs and detects untracked shadow work.
 * Incorporates KVS reconciled ledger and commit-SHA triage cache.
 * Executes in sub-second time to strictly prevent Forge 25-second execution timeouts.
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
  const reconciledPRs = await getReconciledPRs();

  const untrackedPRs = [];
  let trackedCount = 0;
  let totalShadowPoints = 0;

  for (const pr of allPRs) {
    const analysis = analyzePRTracking(pr, projectKey, reconciledPRs);
    if (analysis.isUntracked) {
      let cachedTriage = null;
      try {
        const headSha = pr.head?.sha;
        cachedTriage = await getCachedTriage(owner, repo, pr.number, headSha);
      } catch (cacheErr) {
        console.warn(`Cache lookup failed for PR #${pr.number}: ${cacheErr.message}`);
      }

      if (cachedTriage) {
        totalShadowPoints += (cachedTriage?.estimatedStoryPoints || 0);
      }

      untrackedPRs.push({
        ...pr,
        tracking: analysis,
        triage: cachedTriage
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
      totalShadowPoints
    }
  };
});

/**
 * Resolver: triageSinglePR
 * On-demand Gemini triage for a specific PR with diff context, Jira context, and commit SHA caching.
 */
resolver.define('triageSinglePR', async (req) => {
  const { payload, context } = req;
  const config = await getAppConfig();

  const pr = payload?.pr;
  if (!pr) {
    throw new Error('PR details are required for triage');
  }

  const owner = payload?.owner || config.owner;
  const repo = payload?.repo || config.repo;
  const token = config.githubToken;
  const geminiApiKey = config.geminiApiKey;
  const projectKey = payload?.projectKey || context?.extension?.project?.key || '';

  if (!geminiApiKey) {
    throw new Error('Gemini API key is not configured. Please set your Gemini API key in Settings.');
  }

  const headSha = pr.head?.sha || payload?.headSha;
  const cachedTriage = await getCachedTriage(owner, repo, pr.number, headSha);
  if (cachedTriage) {
    return {
      success: true,
      triage: cachedTriage,
      fromCache: true
    };
  }

  // Enforce demo quota on live Gemini call when using built-in key
  if (config.usingBuiltInGeminiKey) {
    const quota = await checkAndIncrementDemoQuota(50);
    if (!quota || !quota.allowed) {
      throw new Error('Built-in judge demo quota (50/50 live AI triages) reached. Please enter your own Google Gemini API key in Settings for unlimited use.');
    }
  }

  let jiraContext = null;
  if (projectKey) {
    try {
      jiraContext = await fetchProjectContext(projectKey);
    } catch (err) {
      console.warn(`Could not fetch project context: ${err.message}`);
    }
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
      diffSummary = filesResult?.summary || '';
    } catch (err) {
      console.warn(`Could not load files for PR #${pr.number}: ${err.message}`);
    }
  }

  const triage = await triagePRWithGemini(pr, geminiApiKey, diffSummary, null, jiraContext);
  await setCachedTriage(owner, repo, pr.number, headSha, triage);

  return {
    success: true,
    triage
  };
});

/**
 * Resolver: createJiraIssue
 * Creates a Jira issue from PR metadata, records reconciled PR, and updates GitHub PR.
 */
resolver.define('createJiraIssue', async (req) => {
  const { payload, context } = req;
  const config = await getAppConfig();
  const projectKey = payload.projectKey || context?.extension?.project?.key;

  if (!projectKey) {
    throw new Error('Jira project key could not be determined. Please specify a target project.');
  }

  const owner = payload.owner || config.owner;
  const repo = payload.repo || config.repo;

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

  const siteUrl = context?.siteUrl || 'https://ghostgeist.atlassian.net';
  const browseUrl = siteUrl.startsWith('http')
    ? `${siteUrl}/browse/${issueResult.key}`
    : `https://${siteUrl}/browse/${issueResult.key}`;

  await recordReconciledPR({
    owner,
    repo,
    prNumber: payload.prNumber,
    issueKey: issueResult.key,
    issueUrl: browseUrl
  });

  if (config.githubToken) {
    try {
      await updatePullRequestWithIssue({
        owner,
        repo,
        token: config.githubToken,
        prNumber: payload.prNumber,
        issueKey: issueResult.key,
        issueUrl: browseUrl,
        currentTitle: payload.summary,
        currentBody: payload.description
      });
    } catch (ghErr) {
      console.warn(`GitHub write-back failed: ${ghErr.message}`);
    }
  }

  return {
    success: true,
    issue: issueResult
  };
});

/**
 * Resolver: resetDemoData
 * Clears the AI triage cache and reconciled PR ledger from Forge KVS.
 * Returns all open PRs to an untracked, untriaged state for live demo presentation.
 */
resolver.define('resetDemoData', async () => {
  await clearTriageCache();
  await clearReconciledPRs();
  return { success: true };
});

export const handler = resolver.getDefinitions();
