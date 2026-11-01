import test from 'node:test';
import assert from 'node:assert/strict';
import { SlidingWindowRateLimiter } from '../src/utils/rate-limiter.js';

test('SlidingWindowRateLimiter: allows requests within limit', () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, maxRequests: 3 });
  const now = 100000;

  assert.equal(limiter.check('user1', now).allowed, true);
  assert.equal(limiter.check('user1', now + 100).allowed, true);
  assert.equal(limiter.check('user1', now + 200).allowed, true);
  assert.equal(limiter.check('user1', now + 300).allowed, false);
});

test('SlidingWindowRateLimiter: slides window and resets capacity', () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, maxRequests: 2 });
  const now = 100000;

  assert.equal(limiter.check('user1', now).allowed, true);
  assert.equal(limiter.check('user1', now + 100).allowed, true);
  assert.equal(limiter.check('user1', now + 200).allowed, false);

  // Advance time past the sliding window
  assert.equal(limiter.check('user1', now + 1100).allowed, true);
});
