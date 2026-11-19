/**
 * Structured Security Event Logger (OWASP A09: Security Logging and Monitoring Failures)
 * 
 * Emits uniform, single-line JSON structured security events for real-time SIEM,
 * Datadog, Render, and CloudWatch log ingestion.
 * 
 * Guaranteed Invariants:
 * - Automatically redacts sensitive fields (tokens, secrets, passwords, auth headers, api keys).
 * - Never throws exceptions or interrupts request processing on logging failure.
 * - Non-blocking execution.
 */

export type SecurityLevel = 'WARN' | 'CRITICAL' | 'AUDIT';

export type SecurityEventType =
  | 'AUTH_REJECTED'
  | 'DEV_TOKEN_BLOCKED'
  | 'RBAC_DENIED'
  | 'IDOR_ATTEMPT'
  | 'SSRF_BLOCKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ADMIN_OVERRIDE';

export interface SecurityEventPayload {
  level: SecurityLevel;
  eventType: SecurityEventType;
  ip?: string;
  method?: string;
  path?: string;
  actorUid?: string;
  details?: Record<string, unknown>;
}

const REDACTED_KEY_REGEX = /token|secret|password|authorization|key|cookie/i;

/**
 * Deeply redacts sensitive keys from metadata objects.
 */
export function sanitizeSecurityDetails(
  data: unknown,
  seen = new WeakSet<object>()
): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact bearer tokens if present in text
    if (data.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED]';
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Prevent circular references
  if (seen.has(data as object)) {
    return '[CIRCULAR]';
  }
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSecurityDetails(item, seen));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (REDACTED_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeSecurityDetails(val, seen);
    }
  }

  return sanitized;
}

/**
 * Emits a structured security event line as single-line JSON.
 */
export function logSecurityEvent(event: SecurityEventPayload): void {
  try {
    const record = {
      timestamp: new Date().toISOString(),
      service: 'aicity-backend',
      level: event.level,
      eventType: event.eventType,
      ip: event.ip || 'unknown',
      method: event.method || 'INTERNAL',
      path: event.path || 'none',
      actorUid: event.actorUid || 'unauthenticated',
      details: event.details ? sanitizeSecurityDetails(event.details) : undefined,
    };

    const output = JSON.stringify(record);

    if (event.level === 'CRITICAL' || event.level === 'WARN') {
      process.stderr.write(`${output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }
  } catch {
    // Fallback: guaranteed zero throw in security logging path
  }
}

export default logSecurityEvent;
