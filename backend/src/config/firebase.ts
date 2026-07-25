import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const loadServiceAccount = () => {
  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64Key) {
    console.warn('[Firebase] Warning: FIREBASE_SERVICE_ACCOUNT_BASE64 is missing. Access tokens will bypass verification in local development mode.');
    return null;
  }
  try {
    const decodedJson = Buffer.from(base64Key, 'base64').toString('utf8');
    const sa = JSON.parse(decodedJson);
    if (sa.private_key && typeof sa.private_key === 'string') {
      sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    }
    return sa;
  } catch (error) {
    console.error('[Firebase] Error decoding FIREBASE_SERVICE_ACCOUNT_BASE64 payload:', error);
    throw error;
  }
};

export const initializeFirebase = (): void => {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase] Firebase Admin SDK successfully initialized with service account.');
  } else {
    console.log('[Firebase] Firebase Admin operating in Development Bypass Mode.');
  }
};
