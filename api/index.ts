import app from '../backend/src/app';
import { connectDatabase } from '../backend/src/config/db';
import { initializeFirebase } from '../backend/src/config/firebase';
import { configureCloudinary } from '../backend/src/config/cloudinary';

let isInitialized = false;

export default async function handler(req: any, res: any) {
  if (!isInitialized) {
    try {
      await connectDatabase();
      initializeFirebase();
      configureCloudinary();
      isInitialized = true;
    } catch (err) {
      console.error('[Vercel] Serverless initialization error:', err);
    }
  }
  return app(req, res);
}
