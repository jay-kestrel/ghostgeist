import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzePRTracking } from '../src/services/github.js';
import { buildAdfDescription } from '../src/services/jira.js';
import { saveAppConfig, getAppConfig } from '../src/services/config.js';
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
