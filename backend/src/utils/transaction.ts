import mongoose, { ClientSession } from 'mongoose';
import { isMongoConnected } from '../config/dbFallback';
import logger from './logger';

export interface PolyglotTransactionOptions<T> {
  mongoWork: (session: ClientSession | null) => Promise<T>;
  neo4jWork?: (mongoResult: T) => Promise<void>;
  compensateMongo?: (mongoResult: T) => Promise<void>;
}

let isReplicaSetCached: boolean | null = null;

/**
 * Detects whether the active MongoDB instance supports multi-document transactions.
 * Returns true only when connected to a live Replica Set (e.g. MongoDB Atlas or rs0).
 */
export async function supportsReplicaSet(): Promise<boolean> {
  if (!isMongoConnected || mongoose.connection.readyState !== 1) {
    return false;
  }
  if (isReplicaSetCached !== null) {
    return isReplicaSetCached;
  }
  try {
    if (!mongoose.connection.db) {
      isReplicaSetCached = false;
      return false;
    }
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    const isRepl = Boolean(serverStatus.repl || serverStatus.process === 'mongos');
    isReplicaSetCached = isRepl;
    logger.info(`[Transaction] MongoDB ReplicaSet support detected: ${isRepl}`);
    return isRepl;
  } catch {
    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      await session.abortTransaction();
      await session.endSession();
      isReplicaSetCached = true;
      return true;
    } catch {
      isReplicaSetCached = false;
      return false;
    }
  }
}

/**
 * Resets the topology detection cache (used primarily for unit/integration testing).
 */
export function resetReplicaSetDetectionCache(): void {
  isReplicaSetCached = null;
}

/**
 * Executes multi-document operations coordinated across MongoDB and Neo4j.
 * Automatically utilizes ClientSession transactions when on Atlas/ReplicaSet tiers,
 * and executes compensating rollbacks when operating in standalone or in-memory fallback tiers.
 */
export async function executeWithPolyglotTransaction<T>(
  options: PolyglotTransactionOptions<T>
): Promise<T> {
  const { mongoWork, neo4jWork, compensateMongo } = options;
  const canUseReplicaSet = await supportsReplicaSet();

  if (canUseReplicaSet) {
    const session = await mongoose.startSession();
    session.startTransaction();

    let mongoResult: T;
    try {
      mongoResult = await mongoWork(session);
    } catch (mongoErr) {
      logger.error(`[PolyglotTransaction] MongoDB work failed, aborting transaction: ${mongoErr}`);
      await session.abortTransaction();
      await session.endSession();
      throw mongoErr;
    }

    if (neo4jWork) {
      try {
        await neo4jWork(mongoResult);
      } catch (neo4jErr) {
        logger.error(`[PolyglotTransaction] Downstream Neo4j work failed. Aborting MongoDB transaction: ${neo4jErr}`);
        await session.abortTransaction();
        await session.endSession();
        throw neo4jErr;
      }
    }

    await session.commitTransaction();
    await session.endSession();
    return mongoResult;
  } else {
    // Standalone or In-Memory Tier-4 Fallback
    const mongoResult = await mongoWork(null);

    if (neo4jWork) {
      try {
        await neo4jWork(mongoResult);
      } catch (neo4jErr) {
        logger.warn(`[PolyglotTransaction] Neo4j work failed on standalone/fallback tier: ${neo4jErr}`);
        if (compensateMongo) {
          logger.info('[PolyglotTransaction] Executing compensating MongoDB action...');
          try {
            await compensateMongo(mongoResult);
            logger.info('[PolyglotTransaction] Compensating MongoDB action completed.');
          } catch (compErr) {
            logger.error(`[PolyglotTransaction] Compensating MongoDB action failed: ${compErr}`);
          }
        }
        throw neo4jErr;
      }
    }

    return mongoResult;
  }
}

export default executeWithPolyglotTransaction;

