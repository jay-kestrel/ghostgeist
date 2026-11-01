/**
 * Structured JSON Logger for GhostGeist operational security and audit events.
 * Automatically sanitizes sensitive API tokens and credentials.
 */

const SENSITIVE_KEY_PATTERN = /(token|secret|password|key|auth|authorization)/i;

/**
 * Recursively masks sensitive fields in log payloads.
 *
 * @param {any} data
 * @returns {any} Sanitized clone of data
 */
export function sanitizeLogData(data) {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_PATTERN.test(key) && typeof value === 'string' && value.length > 0) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Emits a structured JSON audit log entry to stdout.
 *
 * @param {string} level - 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
 * @param {string} event - Unique event identifier (e.g. 'AUTH_TOKEN_VALIDATION')
 * @param {Object} [metadata={}] - Event details
 * @returns {Object} Structured log object
 */
export function emitAuditLog(level, event, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: (level || 'INFO').toUpperCase(),
    event: event || 'UNKNOWN_EVENT',
    context: sanitizeLogData(metadata)
  };

  const output = JSON.stringify(logEntry);
  if (level === 'ERROR') {
    console.error(output);
  } else if (level === 'WARN') {
    console.warn(output);
  } else {
    console.log(output);
  }

  return logEntry;
}
