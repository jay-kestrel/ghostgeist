import crypto from 'node:crypto';

/**
 * Validates incoming webhook HMAC signatures using constant-time comparison
 * to prevent side-channel timing attacks.
 *
 * @param {string|Buffer} signature - Provided signature from header
 * @param {string|Buffer} expected - Locally computed HMAC hex digest
 * @returns {boolean} True if signatures match identically
 */
export function verifyWebhookSignature(signature, expected) {
  if (!signature || !expected) {
    return false;
  }

  const sigBuf = Buffer.from(String(signature), 'utf8');
  const expBuf = Buffer.from(String(expected), 'utf8');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
