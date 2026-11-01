import test from 'node:test';
import assert from 'node:assert/strict';
import api from '@forge/api';

import { analyzePRTracking, updatePullRequestWithIssue } from '../src/services/github.js';
import { buildAdfDescription, createJiraIssue, fetchProjectContext } from '../src/services/jira.js';
import {
  saveAppConfig,
  getAppConfig,
  recordReconciledPR,
  getReconciledPRs,
  resetMemoryStoreForTesting,
  getCachedTriage,
  setCachedTriage,
  checkAndIncrementDemoQuota,
  resetDemoQuotaForTests,
  resetTriageCacheForTests,
  DEFAULT_CONFIG
} from '../src/services/config.js';
import { triagePRWithGemini } from '../src/services/gemini.js';

test('analyzePRTracking: detects untracked PR with no Jira key', () => {
  const pr = {
    title: 'refactor: simplify logger configuration',
    head: { ref: 'refactor/logger-cleanup' },
    body: 'Cleans up duplicate logs and formatting.'
  };

  const result = analyzePRTracking(pr);
  assert.equal(result.isUntracked, true);
  assert.equal(result.matchedKey, null);
});

test('analyzePRTracking: detects tracked PR when Jira key in title', () => {
  const pr = {
    title: '[GHOST-42] Fix navigation dropdown crash',
    head: { ref: 'fix/nav-dropdown' },
    body: 'Fixes dropdown crash on safari.'
  };

  const result = analyzePRTracking(pr);
  assert.equal(result.isUntracked, false);
  assert.equal(result.matchedKey, 'GHOST-42');
});

test('analyzePRTracking: detects tracked PR when Jira key in branch ref', () => {
  const pr = {
    title: 'Fix navigation dropdown crash',
    head: { ref: 'feature/GHOST-108-oauth-flow' },
    body: 'Implements OAuth2 flow.'
  };

  const result = analyzePRTracking(pr);
  assert.equal(result.isUntracked, false);
  assert.equal(result.matchedKey, 'GHOST-108');
});

test('analyzePRTracking: detects tracked PR when Jira key in body', () => {
  const pr = {
    title: 'Update database migration script',
    head: { ref: 'migration-update' },
    body: 'Relates to issue GHOST-555 for production rollout.'
  };

  const result = analyzePRTracking(pr);
  assert.equal(result.isUntracked, false);
  assert.equal(result.matchedKey, 'GHOST-555');
});

test('analyzePRTracking: marks tracked if PR matches any valid Jira key, preferring target project key if present', () => {
  const prOther = {
    title: 'Fix issue in OTHER-999',
    head: { ref: 'bugfix/other-issue' },
    body: 'Fixes OTHER-999.'
  };

  // Even when evaluating for GHOST project, PR tracked under OTHER-999 is recognized as tracked
  const resultForGhost = analyzePRTracking(prOther, 'GHOST');
  assert.equal(resultForGhost.isUntracked, false);
  assert.equal(resultForGhost.matchedKey, 'OTHER-999');

  // Against OTHER project, this PR is also tracked
  const resultForOther = analyzePRTracking(prOther, 'OTHER');
  assert.equal(resultForOther.isUntracked, false);
  assert.equal(resultForOther.matchedKey, 'OTHER-999');

  // When both keys are referenced, prefers target project key
  const prBoth = {
    title: 'Fix OTHER-999 and GHOST-123',
    head: { ref: 'bugfix/cross-ref' },
    body: 'References both projects'
  };
  const resultBoth = analyzePRTracking(prBoth, 'GHOST');
  assert.equal(resultBoth.isUntracked, false);
  assert.equal(resultBoth.matchedKey, 'GHOST-123');
});

test('buildAdfDescription: produces valid ADF structure with PR link and AI insights', () => {
  const text = 'First paragraph describing the problem.\n\nSecond paragraph explaining the technical solution.';
  const prUrl = 'https://github.com/octocat/repo/pull/42';
  const prNumber = 42;
  const author = 'octocat';
  const estimatedPoints = 3;
  const reason = 'Moderate complexity bug fix touching database layers.';

  const adf = buildAdfDescription(text, prUrl, prNumber, author, estimatedPoints, reason);

  assert.equal(adf.version, 1);
  assert.equal(adf.type, 'doc');
  assert.ok(Array.isArray(adf.content));
  assert.equal(adf.content.length, 4); // 2 text paragraphs + 1 PR context paragraph + 1 AI analysis paragraph

  // First paragraph
  assert.equal(adf.content[0].type, 'paragraph');
  assert.equal(adf.content[0].content[0].text, 'First paragraph describing the problem.');

  // PR context block
  const prBlock = adf.content[2];
  assert.equal(prBlock.type, 'paragraph');
  const linkNode = prBlock.content.find((n) => n.marks?.some((m) => m.type === 'link'));
  assert.ok(linkNode);
  assert.equal(linkNode.marks[0].attrs.href, prUrl);
  assert.equal(linkNode.text, '#42 on GitHub');

  // AI insights block
  const aiBlock = adf.content[3];
  assert.equal(aiBlock.type, 'paragraph');
  assert.ok(aiBlock.content[1].text.includes('Estimated 3 Story Points'));
  assert.ok(aiBlock.content[1].text.includes(reason));
});

test('buildAdfDescription: handles empty or null input gracefully', () => {
  const adf = buildAdfDescription(null, null, null, null, null, null);
  assert.equal(adf.version, 1);
  assert.equal(adf.type, 'doc');
  assert.ok(Array.isArray(adf.content));
  assert.ok(adf.content.length > 0);
});

test('buildAdfDescription: ADF spec strictly prevents empty string text nodes', () => {
  // Test with null author and blank reason/points
  const adf1 = buildAdfDescription('Some description', 'https://github.com/org/repo/pull/1', 1, null, null, '');

  function assertNoEmptyTextNodes(nodes) {
    for (const node of nodes) {
      if (node.type === 'text') {
        assert.ok(node.text && node.text.length > 0, `Text node must not be empty string: ${JSON.stringify(node)}`);
      }
      if (Array.isArray(node.content)) {
        assertNoEmptyTextNodes(node.content);
      }
    }
  }

  assertNoEmptyTextNodes(adf1.content);

  // Author node should not be present when author is null or empty
  const prParagraph = adf1.content[1];
  assert.equal(prParagraph.content.length, 2); // Only "Source Pull Request: " and "#1 on GitHub"

  // Test with empty string author and empty spaces reason
  const adf2 = buildAdfDescription('Some description', 'https://github.com/org/repo/pull/2', 2, '   ', 0, '   ');
  assertNoEmptyTextNodes(adf2.content);
  assert.equal(adf2.content.length, 2); // No shadow analysis block should be pushed
});

test('saveAppConfig: guards against non-string/null inputs and preserves existing secrets', async () => {
  // Initial save with credentials
  await saveAppConfig({
    owner: 'org',
    repo: 'repo',
    githubToken: 'ghp_secret123',
    geminiApiKey: 'AIza_secret456'
  });

  let config = await getAppConfig();
  assert.equal(config.owner, 'org');
  assert.equal(config.repo, 'repo');
  assert.equal(config.githubToken, 'ghp_secret123');
  assert.equal(config.geminiApiKey, 'AIza_secret456');

  // Update repo only, passing null, undefined, empty strings for tokens
  await saveAppConfig({
    owner: 'new-org',
    repo: 'new-repo',
    githubToken: '',
    geminiApiKey: '   '
  });

  config = await getAppConfig();
  assert.equal(config.owner, 'new-org');
  assert.equal(config.repo, 'new-repo');
  // Secrets should be preserved!
  assert.equal(config.githubToken, 'ghp_secret123');
  assert.equal(config.geminiApiKey, 'AIza_secret456');

  // Verify non-string / null does not crash
  await saveAppConfig({
    owner: null,
    repo: 12345,
    githubToken: null,
    geminiApiKey: undefined
  });

  config = await getAppConfig();
  assert.equal(config.owner, 'new-org');
  assert.equal(config.repo, 'new-repo');
  assert.equal(config.githubToken, 'ghp_secret123');
  assert.equal(config.geminiApiKey, 'AIza_secret456');
});

test('triagePRWithGemini: uses header-based auth and gemini-3 line models', async () => {
  const capturedCalls = [];

  const mockFetch = async (url, options) => {
    capturedCalls.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    suggestedTitle: 'Synthesized Title',
                    suggestedDescription: 'Synthesized Description',
                    issueType: 'Bug',
                    estimatedStoryPoints: 3,
                    reason: 'Synthesized Reason'
                  })
                }
              ]
            }
          }
        ]
      })
    };
  };

  const pr = {
    number: 99,
    title: 'Fix edge case crash',
    body: 'Details here',
    user: { login: 'dev' },
    head: { ref: 'bugfix' },
    base: { ref: 'main' }
  };

  const result = await triagePRWithGemini(pr, 'AIzaTestApiKey', '', mockFetch);

  assert.equal(result.suggestedTitle, 'Synthesized Title');
  assert.equal(result.issueType, 'Bug');
  assert.equal(result.estimatedStoryPoints, 3);
  assert.equal(capturedCalls.length, 1);

  const firstCall = capturedCalls[0];
  // Must NOT have key in query parameter
  assert.ok(!firstCall.url.includes('key='), 'API key must not be in query parameters');
  assert.ok(firstCall.url.includes('gemini-3.8-flash'), 'Should first call gemini-3.8-flash');
  // Must use x-goog-api-key header
  assert.equal(firstCall.options.headers['x-goog-api-key'], 'AIzaTestApiKey');
});

// --- NEW AUDIT VERIFICATION TESTS ---

test('api.asUser() priority: attempts asUser first, falling back to asApp on failure', async () => {
  const callOrder = [];
  const origAsUser = api.asUser;
  const origAsApp = api.asApp;

  try {
    api.asUser = () => ({
      requestJira: async () => {
        callOrder.push('asUser');
        return { ok: false, status: 403, text: async () => 'Forbidden' };
      }
    });

    api.asApp = () => ({
      requestJira: async () => {
        callOrder.push('asApp');
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: '10001', key: 'GHOST-99', self: 'https://test/issue/10001' })
        };
      }
    });

    const result = await createJiraIssue({
      projectKey: 'GHOST',
      summary: 'Fallback test issue',
      description: 'Testing fallback from asUser to asApp',
      issueType: 'Task'
    });

    assert.equal(result.key, 'GHOST-99');
    assert.deepEqual(callOrder, ['asUser', 'asApp']);
  } finally {
    api.asUser = origAsUser;
    api.asApp = origAsApp;
  }
});

test('api.asUser() priority: attributes to asUser when asUser succeeds', async () => {
  const callOrder = [];
  const origAsUser = api.asUser;
  const origAsApp = api.asApp;

  try {
    api.asUser = () => ({
      requestJira: async () => {
        callOrder.push('asUser');
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: '10002', key: 'GHOST-100', self: 'https://test/issue/10002' })
        };
      }
    });

    api.asApp = () => ({
      requestJira: async () => {
        callOrder.push('asApp');
        return { ok: true, json: async () => ({}) };
      }
    });

    const result = await createJiraIssue({
      projectKey: 'GHOST',
      summary: 'Direct user test issue',
      description: 'Testing direct user attribution',
      issueType: 'Bug'
    });

    assert.equal(result.key, 'GHOST-100');
    assert.deepEqual(callOrder, ['asUser']);
  } finally {
    api.asUser = origAsUser;
    api.asApp = origAsApp;
  }
});

test('Reconciled PR persistence in KVS & analyzePRTracking filtering', async () => {
  const entry = await recordReconciledPR({
    owner: 'jay-kestrel',
    repo: 'ghostgeist',
    prNumber: 77,
    issueKey: 'GHOST-77',
    issueUrl: 'https://ghostgeist.atlassian.net/browse/GHOST-77'
  });

  assert.equal(entry.prNumber, 77);
  assert.equal(entry.issueKey, 'GHOST-77');

  const reconciledList = await getReconciledPRs();
  assert.ok(Array.isArray(reconciledList));
  const found = reconciledList.find((r) => r.prNumber === 77);
  assert.ok(found);
  assert.equal(found.issueKey, 'GHOST-77');

  // PR 77 has NO Jira key in title, branch, or body
  const prReconciled = {
    number: 77,
    title: 'Clean up dead code',
    head: { ref: 'chore/cleanup' },
    body: 'Removes unused variables.'
  };

  const trackingResult = analyzePRTracking(prReconciled, 'GHOST', reconciledList);
  assert.equal(trackingResult.isUntracked, false);
  assert.equal(trackingResult.matchedKey, 'GHOST-77');

  // PR 78 is not in reconciledList and has no Jira key
  const prUntracked = {
    number: 78,
    title: 'Clean up dead code',
    head: { ref: 'chore/cleanup-dead-code' },
    body: 'Removes more unused variables.'
  };

  const trackingResult2 = analyzePRTracking(prUntracked, 'GHOST', reconciledList);
  assert.equal(trackingResult2.isUntracked, true);
  assert.equal(trackingResult2.matchedKey, null);
});

test('triagePRWithGemini: grounds in jiraContext and identifies matchedExistingIssueKey', async () => {
  let capturedPayload = null;

  const mockFetch = async (url, options) => {
    capturedPayload = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    suggestedTitle: 'Resolved Session Leak',
                    suggestedDescription: 'Fixes session leak described in GHOST-12',
                    issueType: 'Bug',
                    estimatedStoryPoints: 5,
                    reason: 'Critical bug impacting session manager',
                    matchedExistingIssueKey: 'GHOST-12'
                  })
                }
              ]
            }
          }
        ]
      })
    };
  };

  const pr = {
    number: 12,
    title: 'fix session leak',
    body: 'addresses the redis session retention problem',
    user: { login: 'octocat' },
    head: { ref: 'fix/session-leak' },
    base: { ref: 'main' }
  };

  const jiraContext = {
    projectKey: 'GHOST',
    validIssueTypes: ['Task', 'Bug', 'Story'],
    recentIssues: [
      { key: 'GHOST-12', summary: 'Memory leak in session manager', issueType: 'Bug', status: 'In Progress' }
    ]
  };

  const result = await triagePRWithGemini(pr, 'AIzaTestApiKey', '', mockFetch, jiraContext);

  assert.equal(result.suggestedTitle, 'Resolved Session Leak');
  assert.equal(result.issueType, 'Bug');
  assert.equal(result.estimatedStoryPoints, 5);
  assert.equal(result.matchedExistingIssueKey, 'GHOST-12');

  // Verify prompt included Atlassian Project Context
  const promptText = capturedPayload.contents[0].parts[0].text;
  assert.ok(promptText.includes('Atlassian Project Context'));
  assert.ok(promptText.includes('GHOST-12'));
  assert.ok(promptText.includes('Memory leak in session manager'));
});

test('getAppConfig: falls back to default owner jay-kestrel and repo ghostgeist', async () => {
  resetMemoryStoreForTesting();

  const config = await getAppConfig();
  assert.equal(config.owner, 'jay-kestrel');
  assert.equal(config.repo, 'ghostgeist');
});

test('createJiraIssue: falls back to first valid issue type if requested type is not in validIssueTypes', async () => {
  let capturedPayload = null;
  const origAsUser = api.asUser;

  try {
    api.asUser = () => ({
      requestJira: async (routeObj, options) => {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: '10003', key: 'GHOST-101', self: 'https://test/issue/10003' })
        };
      }
    });

    await createJiraIssue({
      projectKey: 'GHOST',
      summary: 'Custom scheme issue',
      description: 'Testing valid issue types fallback',
      issueType: 'NonExistentCustomType',
      validIssueTypes: ['StandardTask', 'StandardBug']
    });

    assert.equal(capturedPayload.fields.issuetype.name, 'StandardTask');
  } finally {
    api.asUser = origAsUser;
  }
});

test('updatePullRequestWithIssue: updates PR title and body when token is provided', async () => {
  let patchUrl = null;
  let patchBody = null;

  const mockFetch = async (url, options) => {
    patchUrl = url;
    patchBody = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({}) };
  };

  const success = await updatePullRequestWithIssue({
    owner: 'jay-kestrel',
    repo: 'ghostgeist',
    token: 'ghp_mock_token',
    prNumber: 42,
    issueKey: 'GHOST-42',
    issueUrl: 'https://ghostgeist.atlassian.net/browse/GHOST-42',
    currentTitle: 'feat: add metrics',
    currentBody: 'Implements tracking metrics',
    customFetch: mockFetch
  });

  assert.equal(success, true);
  assert.ok(patchUrl.includes('/repos/jay-kestrel/ghostgeist/pulls/42'));
  assert.equal(patchBody.title, '[GHOST-42] feat: add metrics');
  assert.ok(patchBody.body.includes('**Tracked in Jira:** [GHOST-42]'));
});

test('updatePullRequestWithIssue: fails gracefully without token', async () => {
  const success = await updatePullRequestWithIssue({
    owner: 'jay-kestrel',
    repo: 'ghostgeist',
    token: '',
    prNumber: 42,
    issueKey: 'GHOST-42'
  });

  assert.equal(success, false);
});

test('fetchProjectContext: gracefully falls back in test environments', async () => {
  const context = await fetchProjectContext('GHOST');
  assert.ok(Array.isArray(context.validIssueTypes));
  assert.ok(context.validIssueTypes.includes('Task'));
  assert.ok(Array.isArray(context.recentIssues));
});

test('getCachedTriage / setCachedTriage: stores and retrieves triage results keyed by commit SHA', async () => {
  resetTriageCacheForTests();

  const owner = 'jay-kestrel';
  const repo = 'ghostgeist';
  const prNumber = 101;
  const shaA = 'commit-sha-aaa111';
  const shaB = 'commit-sha-bbb222';

  // 1. Initial lookup -> miss
  const miss1 = await getCachedTriage(owner, repo, prNumber, shaA);
  assert.equal(miss1, null, 'Expected initial cache lookup to be a miss');

  // 2. Set cached triage for shaA
  const triageA = {
    suggestedTitle: 'Optimize SQL Query',
    suggestedDescription: 'Indexes users table for speed',
    issueType: 'Task',
    estimatedStoryPoints: 3,
    reason: 'Performance enhancement'
  };
  await setCachedTriage(owner, repo, prNumber, shaA, triageA);

  // 3. Lookup with exact match (owner, repo, prNumber, shaA) -> hit
  const hitA = await getCachedTriage(owner, repo, prNumber, shaA);
  assert.ok(hitA, 'Expected cache hit for matching SHA');
  assert.equal(hitA.suggestedTitle, 'Optimize SQL Query');
  assert.equal(hitA.estimatedStoryPoints, 3);

  // 4. Lookup with new commit SHA (shaB) -> miss (invalidates cache on new commit push)
  const missOnShaUpdate = await getCachedTriage(owner, repo, prNumber, shaB);
  assert.equal(missOnShaUpdate, null, 'Cache must miss when head commit SHA changes');

  // 5. Lookup for different PR number with same SHA -> miss
  const missOtherPR = await getCachedTriage(owner, repo, 102, shaA);
  assert.equal(missOtherPR, null, 'Cache must miss for different PR number');

  // 6. Set cached triage for shaB and verify independent entry
  const triageB = {
    suggestedTitle: 'Optimize SQL Query & Add Metrics',
    suggestedDescription: 'Adds Prometheus metrics',
    issueType: 'Story',
    estimatedStoryPoints: 5,
    reason: 'Expanded scope in new commit'
  };
  await setCachedTriage(owner, repo, prNumber, shaB, triageB);

  const hitB = await getCachedTriage(owner, repo, prNumber, shaB);
  assert.equal(hitB.suggestedTitle, 'Optimize SQL Query & Add Metrics');
  assert.equal(hitB.estimatedStoryPoints, 5);

  // Previous commit entry remains accessible if queried
  const hitAgainA = await getCachedTriage(owner, repo, prNumber, shaA);
  assert.equal(hitAgainA.suggestedTitle, 'Optimize SQL Query');

  // Fallback to "latest" if sha is omitted
  await setCachedTriage(owner, repo, 200, null, triageA);
  const hitLatest = await getCachedTriage(owner, repo, 200, null);
  assert.equal(hitLatest.suggestedTitle, 'Optimize SQL Query');
});

test('checkAndIncrementDemoQuota: enforces cap and denies calls exceeding quota', async () => {
  resetDemoQuotaForTests();

  const cap = 3;

  // First 3 calls must succeed
  const c1 = await checkAndIncrementDemoQuota(cap);
  assert.equal(c1.allowed, true);
  assert.equal(c1.count, 1);

  const c2 = await checkAndIncrementDemoQuota(cap);
  assert.equal(c2.allowed, true);
  assert.equal(c2.count, 2);

  const c3 = await checkAndIncrementDemoQuota(cap);
  assert.equal(c3.allowed, true);
  assert.equal(c3.count, 3);

  // 4th call must be denied (count would exceed cap)
  const c4 = await checkAndIncrementDemoQuota(cap);
  assert.equal(c4.allowed, false);
  assert.equal(c4.count, 3);

  // 5th call also denied
  const c5 = await checkAndIncrementDemoQuota(cap);
  assert.equal(c5.allowed, false);
  assert.equal(c5.count, 3);

  // Reset helper clears quota
  resetDemoQuotaForTests();
  const resetCall = await checkAndIncrementDemoQuota(cap);
  assert.equal(resetCall.allowed, true);
  assert.equal(resetCall.count, 1);
});

test('usingBuiltInGeminiKey: tracks built-in fallback vs custom key override', async () => {
  const origDefaultKey = DEFAULT_CONFIG.geminiApiKey;
  const origEnvKey = process.env.GEMINI_API_KEY;

  try {
    // 1. Simulate environment where built-in fallback key is active
    DEFAULT_CONFIG.geminiApiKey = 'built-in-judge-test-key';
    process.env.GEMINI_API_KEY = 'built-in-judge-test-key';
    resetMemoryStoreForTesting();

    let config = await getAppConfig();
    assert.equal(config.usingBuiltInGeminiKey, true, 'Should indicate using built-in key when no custom key configured');
    assert.equal(config.geminiApiKey, 'built-in-judge-test-key');

    // 2. User provides their own custom API key in Settings
    const saveResult = await saveAppConfig({
      owner: 'acme-corp',
      repo: 'web-service',
      geminiApiKey: 'custom-judge-api-key-999'
    });
    assert.equal(saveResult.usingBuiltInGeminiKey, false, 'Should flag custom key is active');
    assert.equal(saveResult.geminiApiKey, 'custom-judge-api-key-999');

    config = await getAppConfig();
    assert.equal(config.usingBuiltInGeminiKey, false, 'getAppConfig must report usingBuiltInGeminiKey=false');
    assert.equal(config.geminiApiKey, 'custom-judge-api-key-999');

    // 3. User updates another setting (e.g. repo name) without entering a new key
    await saveAppConfig({
      repo: 'web-service-v2',
      geminiApiKey: ''
    });

    config = await getAppConfig();
    assert.equal(config.usingBuiltInGeminiKey, false, 'Existing custom key is preserved, still custom');
    assert.equal(config.geminiApiKey, 'custom-judge-api-key-999');
    assert.equal(config.repo, 'web-service-v2');

    // 4. When neither built-in nor custom key is set
    DEFAULT_CONFIG.geminiApiKey = '';
    process.env.GEMINI_API_KEY = '';
    resetMemoryStoreForTesting();

    config = await getAppConfig();
    assert.equal(config.usingBuiltInGeminiKey, false, 'No key active, usingBuiltInGeminiKey should be false');
    assert.equal(config.geminiApiKey, '');
  } finally {
    DEFAULT_CONFIG.geminiApiKey = origDefaultKey;
    process.env.GEMINI_API_KEY = origEnvKey;
    resetMemoryStoreForTesting();
  }
});
