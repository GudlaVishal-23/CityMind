import express, { Express } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import env from './config/env';
import apiRouter from './routes';
import errorHandler, { AppError } from './middleware/error.middleware';
import { globalApiLimiter } from './middleware/rateLimit.middleware';
import { getPersistenceHealth as getMongoPersistenceHealth } from './config/dbFallback';
import { getPersistenceHealth as getNeo4jPersistenceHealth } from './config/neo4j';
import logger from './utils/logger';

dotenv.config();

const app: Express = express();

/**
 * Resolves allowed CORS origins strictly from environment configuration (DEF-SEC-03).
 * Defaults to ['http://localhost:5173', 'http://localhost:3000'] in development/test.
 */
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }
  return env.corsOrigins.length > 0
    ? env.corsOrigins
    : ['http://localhost:5173', 'http://localhost:3000', 'https://city-mind-ecru.vercel.app'];
};

// Security and Policy configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    }
  })
);

// Strict CORS Whitelist Configuration (DEF-SEC-03)
const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
    // Allow non-browser requests or same-origin requests where Origin header is absent
    if (!origin) {
      return callback(null, true);
    }

    const sanitizedOrigin = origin.replace(/\/$/, '');
    const allowed = getAllowedOrigins();

    if (
      allowed.includes(sanitizedOrigin) ||
      sanitizedOrigin === 'https://city-mind-ecru.vercel.app' ||
      /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(sanitizedOrigin)
    ) {
      return callback(null, true);
    }

    logger.warn(`[CORS Security Warning] Blocked request from unauthorized origin: ${origin}`);
    return callback(
      new AppError(`CORS Not Allowed: origin [${origin}] is not authorized`, 403, 'CORS_NOT_ALLOWED')
    );
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Scoped 50MB body parser for citizen incident reports and media uploads (DEF-OPS-04)
app.use('/api/incidents', express.json({ limit: '50mb' }));
app.use('/api/incidents', express.urlencoded({ limit: '50mb', extended: true }));

// Global 2MB body parser limit for all standard API endpoints
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// HTTP logging format matching environmental modes
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// Health check endpoint with live persistence tier telemetry (DEF-DATA-01)
app.get('/health', (_req, res) => {
  const mongoHealth = getMongoPersistenceHealth();
  const neo4jHealth = getNeo4jPersistenceHealth();
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    persistence: {
      mongoTier: mongoHealth.mongoTier,
      isMongoConnected: mongoHealth.isMongoConnected,
      mongoMemoryRecords: mongoHealth.memoryRecordCount,
      neo4jMode: neo4jHealth.neo4jMode,
      isNeo4jConnected: neo4jHealth.isNeo4jConnected,
      graphMemoryNodes: neo4jHealth.memoryRecordCount
    }
  });
});

// Mount routes with Global API rate limiter (DEF-OPS-04)
app.use('/api', globalApiLimiter, apiRouter);

// Global Error Interception Middleware
app.use(errorHandler);

export default app;
