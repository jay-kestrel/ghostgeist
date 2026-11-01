/**
 * GhostGeist MCP Action Handler
 * Exposes GhostGeist tools to Atlassian Rovo and AI Agent ecosystems via Forge rovo:mcp.
 */
import { getAppConfig } from '../services/config';
import { fetchPullRequests, fetchSinglePR, fetchPullRequestFiles, analyzePRTracking } from '../services/github';
import { triagePRWithGemini } from '../services/gemini';
import { createJiraIssue } from '../services/jira';

export async function handler(payload, context) {
  const inputs = payload?.inputs || payload || {};
  const actionKey = context?.moduleKey || payload?.actionKey || payload?.key;

  const config = await getAppConfig();

  switch (actionKey) {
    case 'get-untracked-prs': {
      const owner = inputs.owner || config.owner;
      const repo = inputs.repo || config.repo;
      const token = inputs.githubToken || config.githubToken;

      if (!owner || !repo) {
        throw new Error('GitHub owner and repository must be specified in tool inputs or app configuration.');
      }

      const allPRs = await fetchPullRequests({ owner, repo, token, state: 'open' });
      const untrackedPRs = allPRs.filter((pr) => analyzePRTracking(pr).isUntracked);

      return {
        success: true,
        totalOpenPRs: allPRs.length,
        untrackedCount: untrackedPRs.length,
        prs: untrackedPRs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          author: pr.user?.login || 'unknown',
          url: pr.html_url,
          branch: pr.head?.ref,
          created_at: pr.created_at
        }))
      };
    }

    case 'triage-pr-gemini': {
      const prNumber = Number(inputs.prNumber);
      if (!prNumber) {
        throw new Error('prNumber is required to triage a pull request.');
      }

      const owner = inputs.owner || config.owner;
      const repo = inputs.repo || config.repo;
      const token = inputs.githubToken || config.githubToken;
      const geminiApiKey = inputs.geminiApiKey || config.geminiApiKey;

      if (!owner || !repo) {
        throw new Error('GitHub repository details not provided.');
      }

      if (!geminiApiKey) {
        throw new Error('Gemini API key is required. Please provide geminiApiKey input or configure in app settings.');
      }

      const pr = await fetchSinglePR({ owner, repo, token, prNumber });
      const diffResult = await fetchPullRequestFiles({ owner, repo, token, prNumber });

      const triage = await triagePRWithGemini(pr, geminiApiKey, diffResult.summary);

      return {
        success: true,
        pr: {
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          author: pr.user?.login
        },
        triage
      };
    }

    case 'create-jira-ticket-from-pr': {
      const { projectKey, summary, description, issueType, prUrl, prNumber } = inputs;

      if (!projectKey || !summary || !description) {
        throw new Error('projectKey, summary, and description are required.');
      }

      const result = await createJiraIssue({
        projectKey,
        summary,
        description,
        issueType: issueType || 'Task',
        prUrl,
        prNumber: prNumber ? Number(prNumber) : undefined
      });

      return {
        success: true,
        issueKey: result.key,
        issueId: result.id
      };
    }

    default:
      throw new Error(`Unknown GhostGeist MCP action: ${actionKey}`);
  }
}
