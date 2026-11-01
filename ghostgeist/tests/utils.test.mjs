import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { SessionCache } from '../../auth-cache.js';
import { verifyWebhookSignature } from '../src/utils/security.js';
import { withExponentialBackoff } from '../src/utils/retry.js';

test('SessionCache: stores and retrieves items correctly', () => {
  const cache = new SessionCache(3);
  cache.set('s1', { user: 'alice' });
  cache.set('s2', { user: 'bob' });

  assert.deepEqual(cache.get('s1'), { user: 'alice' });
  assert.deepEqual(cache.get('s2'), { user: 'bob' });
  assert.equal(cache.get('nonexistent'), null);
});

test('SessionCache: evicts oldest key when limit is reached', () => {
  const cache = new SessionCache(2);
  cache.set('k1', 'val1');
  cache.set('k2', 'val2');

  // Accessing k1 makes k1 most recently used, k2 becomes oldest
  cache.get('k1');

  // Insert k3, should evict k2
  cache.set('k3', 'val3');

  assert.equal(cache.get('k2'), null, 'k2 should have been evicted');
  assert.equal(cache.get('k1'), 'val1', 'k1 should still exist');
  assert.equal(cache.get('k3'), 'val3', 'k3 should exist');
});

test('verifyWebhookSignature: accurately verifies identical HMAC signatures', () => {
  const secret = 'super-secret-token';
  const payload = '{"action":"opened","pull_request":{"id":123}}';
  const validSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const invalidSignature = 'sha256=' + crypto.createHmac('sha256', 'wrong-secret').update(payload).digest('hex');

  assert.equal(verifyWebhookSignature(validSignature, validSignature), true);
  assert.equal(verifyWebhookSignature(validSignature, invalidSignature), false);
  assert.equal(verifyWebhookSignature('', validSignature), false);
  assert.equal(verifyWebhookSignature(null, validSignature), false);
  assert.equal(verifyWebhookSignature(validSignature, undefined), false);
  assert.equal(verifyWebhookSignature('short', 'much-longer-expected-signature'), false);
});

test('withExponentialBackoff: succeeds immediately when operation does not throw', async () => {
  let calls = 0;
  const result = await withExponentialBackoff(async () => {
    calls++;
    return 'immediate success';
  }, { maxRetries: 3, baseDelayMs: 1 });

  assert.equal(result, 'immediate success');
  assert.equal(calls, 1);
});

test('withExponentialBackoff: retries on transient errors and resolves on eventual success', async () => {
  let calls = 0;
  const result = await withExponentialBackoff(async () => {
    calls++;
    if (calls < 3) {
      throw new Error('HTTP 429 Rate Limited');
    }
    return 'recovered';
  }, { maxRetries: 4, baseDelayMs: 2 });

  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
});

test('withExponentialBackoff: throws final error when retry attempts are exhausted', async () => {
  let calls = 0;
  await assert.rejects(async () => {
    await withExponentialBackoff(async () => {
      calls++;
      throw new Error('HTTP 503 Service Unavailable');
    }, { maxRetries: 3, baseDelayMs: 2 });
  }, { message: 'HTTP 503 Service Unavailable' });

  assert.equal(calls, 3);
});
