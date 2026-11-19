import dotenv from 'dotenv';
import { z } from 'zod';
import logger from '../utils/logger';

// Load environment variables immediately before schema parsing
dotenv.config();

/**
 * Zod Schema defining strict environment configuration for AI CITY Backend.
 * Validates types, defaults, and production-grade security constraints (DEF-SEC-01).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  
  // Database configuration
  MONGODB_URI: z.string().optional(),
  MONGO_URI: z.string().optional(),

  // Gemini AI Engine configuration
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL_NAME: z.string().default('gemini-2.0-flash'),

  // Security & Networking
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  ALLOWED_IMAGE_DOMAINS: z
    .string()
    .default('res.cloudinary.com,lh3.googleusercontent.com,firebasestorage.googleapis.com'),
  ENABLE_DEV_AUTH: z
    .union([z.enum(['true', 'false', '']), z.boolean()])
    .optional()
    .transform((val) => val === true || val === 'true'),

  // External Providers
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),

  // Neo4j Graph DB
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USER: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().default('aicity1234')
}).superRefine((data, ctx) => {
  // Production Fail-Fast Validation Gates
  if (data.NODE_ENV === 'production') {
    const mongoUri = data.MONGODB_URI || data.MONGO_URI;
    if (!mongoUri || mongoUri.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MONGODB_URI'],
        message: 'MONGODB_URI is strictly required when NODE_ENV is production.'
      });
    }

    if (!data.GEMINI_API_KEY || data.GEMINI_API_KEY.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GEMINI_API_KEY'],
        message: 'GEMINI_API_KEY is strictly required when NODE_ENV is production for autonomous agent operation.'
      });
    }

    if (data.ENABLE_DEV_AUTH === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ENABLE_DEV_AUTH'],
        message: 'ENABLE_DEV_AUTH cannot be set to true in production mode (DEF-SEC-02).'
      });
    }
  }
});

export type RawEnv = z.infer<typeof envSchema>;

export interface ValidatedEnv extends RawEnv {
  corsOrigins: string[];
  allowedImageDomains: string[];
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

const enrichEnv = (data: RawEnv): ValidatedEnv => {
  const origins = (data.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const imageDomains = (data.ALLOWED_IMAGE_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return {
    ...data,
    corsOrigins: origins,
    allowedImageDomains: imageDomains.length > 0
      ? imageDomains
      : ['res.cloudinary.com', 'lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
    isProduction: data.NODE_ENV === 'production',
    isDevelopment: data.NODE_ENV === 'development',
    isTest: data.NODE_ENV === 'test'
  };
};

/**
 * Execute environment parsing with fail-fast fatal termination in production.
 * Sanitizes output to guarantee zero credential exposure in logs (DEF-SEC-01).
 */
export const validateEnvironment = (): ValidatedEnv => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');

    const fatalMessage = `
================================================================================
❌ [FATAL] APPLICATION CONFIGURATION ERROR: INVALID ENVIRONMENT (DEF-SEC-01)
================================================================================
The AI CITY backend server failed environment validation:
${errorDetails}
================================================================================
`;

    if (process.env.NODE_ENV === 'production') {
      logger.error(fatalMessage);
      console.error(fatalMessage);
      process.exit(1);
    } else {
      logger.warn(fatalMessage);
      console.warn(fatalMessage);
    }

    // In non-production, attempt to parse with fallback defaults to allow local dev resilience
    const fallbackParsed = envSchema.parse({
      ...process.env,
      NODE_ENV: 'development'
    });
    return enrichEnv(fallbackParsed);
  }

  return enrichEnv(result.data);
};

export const env: ValidatedEnv = validateEnvironment();
export default env;
