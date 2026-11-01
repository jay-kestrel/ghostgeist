/**
 * Executes an asynchronous function with exponential backoff and jitter
 * on transient HTTP errors (429 Rate Limit, 503 Service Unavailable).
 *
 * @param {Function} fn - Async operation to execute
 * @param {Object} options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelayMs=500] - Base delay in milliseconds
 * @returns {Promise<any>}
 */
export async function withExponentialBackoff(fn, { maxRetries = 3, baseDelayMs = 500 } = {}) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) {
        throw err;
      }

      // Full jitter: random between 0 and 2^attempt * baseDelay
      const maxDelay = baseDelayMs * Math.pow(2, attempt);
      const delay = Math.floor(Math.random() * maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
