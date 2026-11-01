/**
 * Sliding Window Rate Limiter
 * Tracks timestamped hit records in-memory to limit request bursts and prevent DDoS.
 */
export class SlidingWindowRateLimiter {
  constructor({ windowMs = 60000, maxRequests = 100 } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();
  }

  /**
   * Evaluates if a request is permitted for a given identifier key.
   *
   * @param {string} key - Unique identifier (e.g. client IP or account ID)
   * @param {number} [now=Date.now()] - Timestamp
   * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
   */
  check(key, now = Date.now()) {
    const cleanKey = String(key || 'default');
    const windowStart = now - this.windowMs;

    let timestamps = this.hits.get(cleanKey) || [];
    // Filter out timestamps outside the active sliding window
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0] || now;
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs
      };
    }

    timestamps.push(now);
    this.hits.set(cleanKey, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetMs: this.windowMs
    };
  }

  /**
   * Clears rate limit state for a key or all keys.
   */
  reset(key) {
    if (key) {
      this.hits.delete(String(key));
    } else {
      this.hits.clear();
    }
  }
}
