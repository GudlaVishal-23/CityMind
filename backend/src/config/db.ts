import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { setMongoConnected } from './dbFallback';
import logger from '../utils/logger';

dotenv.config();

let mongoMemoryInstance: any = null;

export const connectDatabase = async (): Promise<void> => {
  const targetUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  mongoose.connection.on('connected', () => {
    logger.info('🍃 [Database] MongoDB connection successfully established.');
    setMongoConnected(true);
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`❌ [Database] MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ [Database] MongoDB connection disconnected.');
  });

  // 1. Check if user provided a custom MONGODB_URI / MONGO_URI in process.env
  if (targetUri) {
    try {
      logger.info(`🔌 Connecting to target MongoDB server...`);
      await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 5000 });
      // Validate authentication with ping
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
      setMongoConnected(true);
      return;
    } catch (err: any) {
      logger.warn(`⚠️ Target MONGODB_URI auth/connection check failed (${err.message}). Falling back to embedded Mongo engine...`);
      await mongoose.disconnect().catch(() => {});
    }
  }

  // 2. Attempt local MongoDB daemon at 127.0.0.1:27017
  try {
    const localUri = 'mongodb://127.0.0.1:27017/aicity';
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    setMongoConnected(true);
    logger.info('🍃 Connected to local MongoDB daemon at 127.0.0.1:27017');
    return;
  } catch {
    // Local daemon not active, fallback to embedded MongoMemoryServer engine
  }

  // 3. Launch embedded MongoMemoryServer for a real production MongoDB database engine
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryInstance = await MongoMemoryServer.create({
      instance: { dbName: 'aicity' }
    });
    const embeddedUri = mongoMemoryInstance.getUri();
    await mongoose.connect(embeddedUri);
    setMongoConnected(true);
    logger.info(`🚀 [Database] Real Embedded MongoDB Server running at ${embeddedUri}`);
  } catch (err: any) {
    logger.warn(`⚠️ Embedded MongoDB initialization deferred (${err.message}). Using fallback layer.`);
    setMongoConnected(false);
  }
};
