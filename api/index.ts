import app from '../backend/src/app';
import { connectDatabase } from '../backend/src/config/db';
import { connectNeo4j } from '../backend/src/config/neo4j';
import { initializeFirebase } from '../backend/src/config/firebase';
import { configureCloudinary } from '../backend/src/config/cloudinary';

declare global {
  // eslint-disable-next-line no-var
  var __aiCityDbInitPromise: Promise<void> | undefined;
}

/**
 * Cold-start database and cloud service initializer for Vercel Serverless.
 * Remediates DEF-OPS-03: Concurrently initializes MongoDB & Neo4j with global connection caching.
 */
async function initServerless(): Promise<void> {
  try {
    initializeFirebase();
    configureCloudinary();

    // Parallel initialization of primary and secondary datastores
    await Promise.allSettled([
      connectDatabase(),
      connectNeo4j()
    ]);
  } catch (err) {
    console.error('[Vercel] Serverless initialization warning:', err);
  }
}

export default async function handler(req: any, res: any) {
  if (!globalThis.__aiCityDbInitPromise) {
    globalThis.__aiCityDbInitPromise = initServerless();
  }
  await globalThis.__aiCityDbInitPromise;
  return app(req, res);
}
