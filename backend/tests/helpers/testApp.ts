import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import app from '../../src/app';
import AIBrainService, { AIBrainResult } from '../../src/services/aiBrain.service';
import DuplicateService, { DuplicateAnalysisResult } from '../../src/services/duplicate.service';
import PHashService from '../../src/services/phash.service';
import { cloudinary } from '../../src/config/cloudinary';
import { connectNeo4j } from '../../src/config/neo4j';
import { setMongoConnected } from '../../src/config/dbFallback';
import User from '../../src/models/user.model';

export const TEST_USERS = {
  'token-citizen-a': {
    uid: 'citizen-a-uid',
    email: 'citizen-a@aicity.gov',
    name: 'Citizen Alpha',
    role: 'citizen' as const
  },
  'token-citizen-b': {
    uid: 'citizen-b-uid',
    email: 'citizen-b@aicity.gov',
    name: 'Citizen Beta',
    role: 'citizen' as const
  },
  'token-officer-1': {
    uid: 'officer-1-uid',
    email: 'officer-1@aicity.gov',
    name: 'Officer Rajesh',
    role: 'officer' as const
  },
  'token-admin-1': {
    uid: 'admin-1-uid',
    email: 'admin-1@aicity.gov',
    name: 'Commissioner Suresh',
    role: 'admin' as const
  }
};

export const TOKENS = {
  CITIZEN_A: 'token-citizen-a',
  CITIZEN_B: 'token-citizen-b',
  OFFICER_1: 'token-officer-1',
  ADMIN_1: 'token-admin-1'
};

const DEFAULT_MOCK_DUPLICATE_RESULT: DuplicateAnalysisResult = {
  isDuplicate: false,
  duplicateScore: 0.05,
  recommendation: 'CREATE_NEW',
  parentIncidentId: null,
  nearbyIncidentIds: [],
  similarity: {
    textCosineSimilarity: 0.05,
    visualPhashSimilarity: 0.05,
    spatialDistanceMeters: 5000
  },
  explanation: 'No duplicate detected in local vicinity',
  textEmbedding: new Array(3072).fill(0.01),
  imageDHash: '0000000000000000111111111111111100000000000000001111111111111111'
};

let mongod: MongoMemoryServer | null = null;
let isInitialized = false;

// Preserved original functions for clean teardown
let originalVerifyIdToken: any = null;
let originalAIBrainExecute: any = null;
let originalUploadStream: any = null;
let originalGenerateContentInternal: any = null;
let originalEmbedContentInternal: any = null;
let originalGenerateHashFromUrl: any = null;

export interface TestContext {
  request: ReturnType<typeof supertest>;
  app: typeof app;
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  resetDatabase: () => Promise<void>;
  authHeader: (token: string) => { Authorization: string };
  getUserByToken: (token: string) => Promise<any>;
}

export function createTestContext(): TestContext {
  const request = supertest(app);

  const setup = async (): Promise<void> => {
    if (isInitialized) return;

    // 1. Ensure test environment variables are established
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DEV_AUTH = 'true';

    // 2. Boot Embedded MongoMemoryServer
    if (!mongod) {
      mongod = await MongoMemoryServer.create({
        instance: { dbName: 'aicity-test' }
      });
      const uri = mongod.getUri();
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
      }
      await mongoose.connect(uri);
      setMongoConnected(true);
    }

    // 3. Connect Neo4j (falls back automatically to in-memory graph emulator)
    await connectNeo4j().catch(() => {});

    // 4. Initialize Firebase Admin if needed & stub verifyIdToken
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: 'aicity-test-project' });
    }
    const authInstance = admin.auth();
    if (!originalVerifyIdToken) {
      originalVerifyIdToken = authInstance.verifyIdToken.bind(authInstance);
    }
    authInstance.verifyIdToken = async (token: string): Promise<any> => {
      const user = TEST_USERS[token as keyof typeof TEST_USERS];
      if (user) {
        return {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          sub: user.uid
        };
      }
      throw new Error(`Firebase ID token [${token}] signature invalid.`);
    };

    // 5. Stub external AIBrainService to avoid Gemini network calls
    if (!originalAIBrainExecute) {
      originalAIBrainExecute = AIBrainService.execute;
    }
    AIBrainService.execute = async (
      _imageUrl: string,
      _description: string,
      _location: { lat: number; lng: number },
      _exifData?: any
    ): Promise<AIBrainResult> => {
      return {
        category: 'Infrastructure',
        severity: 'Medium',
        department: 'PWD',
        confidence: 0.91,
        why: ['Dispatched to PWD based on roadway defect', 'Rated Medium severity due to traffic impact'],
        estimatedResolution: '48 hours',
        imageFeatures: ['pothole', 'asphalt damage', 'roadway hazard'],
        embedding: new Array(3072).fill(0.01),
        imageDHash: '0000000000000000111111111111111100000000000000001111111111111111',
        duplicateAnalysis: null,
        validationStatus: 'VALID',
        rejectionReason: '',
        latencyMs: 15,
        promptTokens: 120,
        completionTokens: 60,
        nodePath: ['intake', 'visualValidation', 'categorize', 'severity', 'department', 'duplicateScan']
      };
    };

    // 6. Stub Gemini Model prototype to intercept any direct LangGraph Gemini API calls
    const dummyGenAI = new GoogleGenAI({ apiKey: 'mock-test-key' });
    const modelsProto = Object.getPrototypeOf(dummyGenAI.models);
    if (!originalGenerateContentInternal) {
      originalGenerateContentInternal = modelsProto.generateContentInternal;
    }
    modelsProto.generateContentInternal = async () => {
      return {
        text: JSON.stringify({
          intent: 'Report hazardous infrastructure defect',
          entities: ['electrical transformer', 'power lines', 'utility pole'],
          summary: 'High voltage electrical hazard sparking near residential road',
          isCivicTopic: true,
          hazardType: 'Electrical Hazard',
          detectedSeverity: 'High',
          suggestedDepartment: 'ELECTRICITY',
          confidence: 0.95,
          features: ['spark', 'transformer', 'pole hazard'],
          severity: 'High',
          department: 'ELECTRICITY'
        })
      };
    };

    if (!originalEmbedContentInternal) {
      originalEmbedContentInternal = modelsProto.embedContentInternal;
    }
    modelsProto.embedContentInternal = async () => {
      return {
        embeddings: [{ values: new Array(3072).fill(0.02) }]
      };
    };

    // 7. Stub PHashService.generateHashFromUrl to avoid remote image downloads in tests
    if (!originalGenerateHashFromUrl) {
      originalGenerateHashFromUrl = PHashService.generateHashFromUrl;
    }
    PHashService.generateHashFromUrl = async () => {
      return '0000000000000000111111111111111100000000000000001111111111111111';
    };

    // 8. Stub Cloudinary uploader.upload_stream
    if (!originalUploadStream) {
      originalUploadStream = cloudinary.uploader.upload_stream;
    }
    (cloudinary.uploader as any).upload_stream = (_options: any, callback?: any) => {
      return {
        end: (_buffer?: any) => {
          if (callback) {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/sample_incident.jpg'
            });
          }
        }
      };
    };

    isInitialized = true;
  };

  const teardown = async (): Promise<void> => {
    // Restore stubs
    if (originalVerifyIdToken && admin.apps.length) {
      admin.auth().verifyIdToken = originalVerifyIdToken;
    }
    if (originalAIBrainExecute) {
      AIBrainService.execute = originalAIBrainExecute;
    }
    if (originalGenerateContentInternal) {
      const dummyGenAI = new GoogleGenAI({ apiKey: 'mock-test-key' });
      const modelsProto = Object.getPrototypeOf(dummyGenAI.models);
      modelsProto.generateContentInternal = originalGenerateContentInternal;
      if (originalEmbedContentInternal) {
        modelsProto.embedContentInternal = originalEmbedContentInternal;
      }
    }
    if (originalGenerateHashFromUrl) {
      PHashService.generateHashFromUrl = originalGenerateHashFromUrl;
    }
    if (originalUploadStream) {
      (cloudinary.uploader as any).upload_stream = originalUploadStream;
    }

    // Close connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
    if (mongod) {
      await mongod.stop().catch(() => {});
      mongod = null;
    }
    isInitialized = false;
  };

  const resetDatabase = async (): Promise<void> => {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      for (const col of collections) {
        await col.deleteMany({});
      }
    }
  };

  const authHeader = (token: string): { Authorization: string } => ({
    Authorization: `Bearer ${token}`
  });

  const getUserByToken = async (token: string): Promise<any> => {
    const userMeta = TEST_USERS[token as keyof typeof TEST_USERS];
    if (!userMeta) return null;
    return User.findOne({ firebaseUid: userMeta.uid });
  };

  return {
    request,
    app,
    setup,
    teardown,
    resetDatabase,
    authHeader,
    getUserByToken
  };
}
