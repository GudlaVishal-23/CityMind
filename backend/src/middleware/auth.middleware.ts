import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import User from '../models/user.model';
import logger from '../utils/logger';
import { logSecurityEvent } from '../utils/securityLogger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        uid?: string;
        firebaseUid: string;
        email: string;
        name: string;
        role: 'citizen' | 'officer' | 'admin';
      };
    }
  }
}

/**
 * Authentication Middleware with strict development token gating (DEF-SEC-02).
 * 
 * - In production: rejects all dev-* tokens and unverified requests with HTTP 401.
 * - In development/test: dev-* tokens are permitted ONLY when ENABLE_DEV_AUTH === 'true'.
 * - Verifies real Firebase JWT tokens via Firebase Admin SDK.
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[Auth Security Warning] Missing or malformed Authorization header on protected route.');
      logSecurityEvent({
        level: 'WARN',
        eventType: 'AUTH_REJECTED',
        ip: req.ip,
        method: req.method,
        path: req.originalUrl || req.path,
        details: { reason: 'Missing or malformed Authorization header' }
      });
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid authentication token required'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn('[Auth Security Warning] Empty Bearer token received on protected route.');
      logSecurityEvent({
        level: 'WARN',
        eventType: 'AUTH_REJECTED',
        ip: req.ip,
        method: req.method,
        path: req.originalUrl || req.path,
        details: { reason: 'Empty Bearer token' }
      });
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid authentication token required'
      });
      return;
    }

    let firebaseUid: string;
    let email: string;
    let name = '';
    let role: 'citizen' | 'officer' | 'admin' = 'citizen';

    const isDevAuthAllowed =
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
      process.env.ENABLE_DEV_AUTH === 'true';

    if (token.startsWith('dev-')) {
      if (!isDevAuthAllowed) {
        logger.warn(
          `[Auth Security Warning] Rejected dev token bypass attempt in '${process.env.NODE_ENV || 'unknown'}' environment (ENABLE_DEV_AUTH='${process.env.ENABLE_DEV_AUTH}').`
        );
        logSecurityEvent({
          level: 'CRITICAL',
          eventType: 'DEV_TOKEN_BLOCKED',
          ip: req.ip,
          method: req.method,
          path: req.originalUrl || req.path,
          details: { env: process.env.NODE_ENV, enableDevAuth: process.env.ENABLE_DEV_AUTH }
        });
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Valid authentication token required'
        });
        return;
      }

      // Local development/test mock identity resolution
      if (token.includes('admin')) {
        firebaseUid = 'dev-admin-uid';
        email = 'admin@aicity.gov';
        name = 'Commissioner Rajesh Kumar';
        role = 'admin';
      } else if (token.includes('officer')) {
        firebaseUid = 'dev-officer-uid';
        email = 'officer@aicity.gov';
        name = 'Inspector Ramesh Kumar';
        role = 'officer';
      } else {
        firebaseUid = 'dev-citizen-uid';
        email = 'citizen@aicity.gov';
        name = 'Priya Sharma';
        role = 'citizen';
      }
      logger.info(`[Auth] Authenticated via development token bypass: ${token} (role=${role}, uid=${firebaseUid})`);
    } else {
      // Production & Real Firebase Verification Flow
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        firebaseUid = decodedToken.uid;
        email = decodedToken.email || '';
        name = decodedToken.name || (email ? email.split('@')[0] : 'Citizen');
        role = (decodedToken.role as 'citizen' | 'officer' | 'admin') || 'citizen';
      } catch (authError) {
        logger.warn(`[Auth Security Warning] Token signature validation failed: ${authError}`);
        logSecurityEvent({
          level: 'WARN',
          eventType: 'AUTH_REJECTED',
          ip: req.ip,
          method: req.method,
          path: req.originalUrl || req.path,
          details: { reason: 'Token signature validation failed' }
        });
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Valid authentication token required'
        });
        return;
      }
    }

    // Synchronize or fetch user profile from Local MongoDB or In-Memory fallback
    let dbUser = await User.findOne({ firebaseUid });
    if (!dbUser) {
      try {
        dbUser = await User.create({
          firebaseUid,
          email,
          name,
          role,
          createdAt: new Date(),
        });
        logger.info(`[Auth] Synchronized new user profile for UID ${firebaseUid} in MongoDB.`);
      } catch (err: any) {
        // Idempotent recovery for concurrent user registration races (E11000)
        if (err?.code === 11000) {
          dbUser = await User.findOne({ firebaseUid });
        } else {
          throw err;
        }
      }
    }

    // Attach profile context to req.user with strict type safety (zero any)
    const userDoc = dbUser as unknown as {
      _id: { toString: () => string };
      firebaseUid: string;
      email: string;
      name?: string;
      role?: string;
    };

    req.user = {
      id: userDoc._id.toString(),
      uid: userDoc.firebaseUid,
      firebaseUid: userDoc.firebaseUid,
      email: userDoc.email,
      name: userDoc.name || name,
      role: (userDoc.role as 'citizen' | 'officer' | 'admin') || role,
    };

    next();
  } catch (error) {
    logger.error(`[Auth] Uncaught authentication middleware exception: ${error}`);
    next(error);
  }
};

export const requireRole = (allowedRoles: ('citizen' | 'officer' | 'admin')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn(`[Auth Security Warning] Access Denied: User role [${req.user?.role || 'none'}] is unauthorized for this route.`);
      logSecurityEvent({
        level: 'WARN',
        eventType: 'RBAC_DENIED',
        ip: req.ip,
        method: req.method,
        path: req.originalUrl || req.path,
        actorUid: req.user?.uid || req.user?.id,
        details: { userRole: req.user?.role || 'none', allowedRoles }
      });
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You lack permissions to access this endpoint.' }
      });
      return;
    }
    next();
  };
};
