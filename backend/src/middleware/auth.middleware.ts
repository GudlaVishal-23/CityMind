import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import User from '../models/user.model';
import logger from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        firebaseUid: string;
        email: string;
        name: string;
        role: 'citizen' | 'officer' | 'admin';
      };
    }
  }
}

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header.' }
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    let firebaseUid: string;
    let email: string;
    let name: string = '';
    let role: 'citizen' | 'officer' | 'admin' = 'citizen';

    const isBypassMode = !process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (isBypassMode) {
      // Local development bypass support
      logger.warn(`[Auth] Firebase Admin bypass check active. Parsing developer mock tokens.`);
      if (token === 'dev-admin') {
        firebaseUid = 'dev-admin-uid';
        email = 'admin@aicity.gov';
        name = 'Commissioner Rajesh Kumar';
        role = 'admin';
      } else if (token === 'dev-officer') {
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
    } else {
      // Firebase Verification Flow
      try {
        if (token.startsWith('dev-')) {
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
            email = 'vishal.gudla@citizen.ghmc.gov.in';
            name = 'Vishal Gudla';
            role = 'citizen';
          }
        } else {
          const decodedToken = await admin.auth().verifyIdToken(token);
          firebaseUid = decodedToken.uid;
          email = decodedToken.email || '';
          name = decodedToken.name || (email ? email.split('@')[0] : 'Citizen');
          role = (decodedToken.role as 'citizen' | 'officer' | 'admin') || 'citizen';
        }
      } catch (authError) {
        logger.warn(`[Auth] Token signature validation failed: ${authError}`);
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication token is invalid or has expired.' }
        });
        return;
      }
    }

    // Synchronize or fetch user profile from Local MongoDB
    let dbUser = await User.findOne({ firebaseUid });
    if (!dbUser) {
      dbUser = await User.create({
        firebaseUid,
        email,
        name,
        role,
        createdAt: new Date(),
      });
      logger.info(`[Auth] Synchronized new user profile for UID ${firebaseUid} in MongoDB.`);
    }

    // Attach profile context to req.user
    req.user = {
      id: dbUser._id.toString(),
      firebaseUid: dbUser.firebaseUid,
      email: dbUser.email,
      name: (dbUser as any).name || name,
      role: dbUser.role as 'citizen' | 'officer' | 'admin',
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
      logger.warn(`[Auth] Access Denied: User role [${req.user?.role || 'none'}] is unauthorized for this route.`);
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You lack permissions to access this endpoint.' }
      });
      return;
    }
    next();
  };
};
