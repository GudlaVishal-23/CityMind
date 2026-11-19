import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { logSecurityEvent } from '../utils/securityLogger';
import './auth.middleware';

/**
 * Helper to determine if rate limiting should be bypassed during testing.
 * Automatically skips when NODE_ENV === 'test' UNLESS the 'x-test-rate-limit: true' header is sent.
 */
const skipRateLimit = (req: Request): boolean => {
  if (process.env.NODE_ENV === 'test') {
    return req.headers['x-test-rate-limit'] !== 'true';
  }
  return false;
};

/**
 * Helper to resolve client identity: prioritizes authenticated user UID over client IP.
 */
const resolveClientKey = (req: Request): string => {
  return req.user?.uid || req.user?.firebaseUid || req.user?.id || req.ip || 'unknown';
};

/**
 * Incident Ingestion Rate Limiter (DEF-OPS-04)
 * Allows up to 30 submissions per minute per user or IP.
 */
export const incidentIngestionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  requestPropertyName: 'rateLimitIncident',
  keyGenerator: resolveClientKey,
  skip: skipRateLimit,
  validate: { xForwardedForHeader: false, default: true },
  handler: (req: Request, res: Response): void => {
    logSecurityEvent({
      level: 'WARN',
      eventType: 'RATE_LIMIT_EXCEEDED',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl || req.path,
      actorUid: req.user?.uid || req.user?.id,
      details: { limiter: 'incidentIngestionLimiter', windowSeconds: 60, limit: 30 }
    });
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Too many incident submissions. Please wait 60 seconds before retrying.',
      retryAfterSeconds: 60
    });
  }
});

/**
 * High-Resolution Media Upload Rate Limiter (DEF-OPS-04)
 * Allows up to 15 image uploads per minute per user or IP for /api/incidents/upload.
 */
export const mediaUploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  requestPropertyName: 'rateLimitUpload',
  keyGenerator: resolveClientKey,
  skip: skipRateLimit,
  validate: { xForwardedForHeader: false, default: true },
  handler: (req: Request, res: Response): void => {
    logSecurityEvent({
      level: 'WARN',
      eventType: 'RATE_LIMIT_EXCEEDED',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl || req.path,
      actorUid: req.user?.uid || req.user?.id,
      details: { limiter: 'mediaUploadLimiter', windowSeconds: 60, limit: 15 }
    });
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Too many media upload requests. Please wait 60 seconds before retrying.',
      retryAfterSeconds: 60
    });
  }
});

/**
 * Global API Rate Limiter (DEF-OPS-04)
 * Broad protection: allows up to 300 requests per 15 minutes per IP across all /api routes.
 */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  requestPropertyName: 'rateLimitGlobal',
  keyGenerator: (req: Request) => req.ip || 'unknown',
  skip: skipRateLimit,
  validate: { xForwardedForHeader: false, default: true },
  handler: (req: Request, res: Response): void => {
    logSecurityEvent({
      level: 'WARN',
      eventType: 'RATE_LIMIT_EXCEEDED',
      ip: req.ip,
      method: req.method,
      path: req.originalUrl || req.path,
      actorUid: req.user?.uid || req.user?.id,
      details: { limiter: 'globalApiLimiter', windowMinutes: 15, limit: 300 }
    });
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Too many requests to the API. Please wait before retrying.',
      retryAfterSeconds: 900
    });
  }
});
