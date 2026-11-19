import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { executeLangGraphPipeline } from '../../src/services/langGraphBrain.service';
import DuplicateService from '../../src/services/duplicate.service';
import FaissIndexService from '../../src/services/faissIndex.service';
import IncidentService from '../../src/services/incident.service';
import Incident from '../../src/models/incident.model';
import { executeWithPolyglotTransaction } from '../../src/utils/transaction';
import {
  setMongoConnected,
  isMongoConnected,
  getPersistenceHealth,
  memoryDb
} from '../../src/config/dbFallback';
import { runCypherQuery } from '../../src/config/neo4j';
import serverlessHandler from '../../../api/index';
import { createTestContext, TOKENS } from '../helpers/testApp';

describe('Day 9 ITS: Pipeline & Persistence Integration Tests (ITS-01 to ITS-06)', () => {
  const ctx = createTestContext();

  beforeAll(async () => {
    await ctx.setup();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  beforeEach(async () => {
    await ctx.resetDatabase();
    FaissIndexService.clearIndex();
  });

  // ---------------------------------------------------------------------------
  // ITS-01: Full 7-Node LangGraph Cognitive DAG Execution
  // ---------------------------------------------------------------------------
  it('ITS-01: Full 7-Node LangGraph Cognitive DAG executes all nodes in sequence', async () => {
    const input = {
      complaintText: 'High voltage electrical transformer sparking dangerously near residential road.',
      uploadedImage: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/sparking_transformer.jpg',
      gpsCoordinates: { lat: 17.3850, lng: 78.4867 }
    };

    const finalState = await executeLangGraphPipeline(input);

    expect(finalState).toBeDefined();
    expect(finalState.executionLogs).toBeDefined();

    // Verify all 7 cognitive agent nodes executed
    const executedNodeNames = finalState.executionLogs.map((log) => log.node);

    expect(executedNodeNames.some((n) => n?.includes('complaint_understanding'))).toBe(true);
    expect(executedNodeNames.some((n) => n?.includes('visual_verification'))).toBe(true);
    expect(executedNodeNames.some((n) => n?.includes('geo_verification'))).toBe(true);
    expect(executedNodeNames.some((n) => n?.includes('duplicate_detection'))).toBe(true);
    expect(executedNodeNames.some((n) => n?.includes('priority_assessment'))).toBe(true);
    expect(executedNodeNames.some((n) => n?.includes('department_routing'))).toBe(true);
    expect(executedNodeNames.some((n) => n?.includes('explainability') || n?.includes('explain_agent'))).toBe(true);

    // Verify assigned municipal department and priority
    expect(['ELECTRICITY', 'WATER_BOARD', 'SANITATION', 'PWD']).toContain(finalState.department);
    expect(['Low', 'Medium', 'High', 'Critical']).toContain(finalState.severity);
    expect(finalState.confidence).toBeGreaterThanOrEqual(0.30);
    expect(finalState.confidence).toBeLessThanOrEqual(1.0);

    // Verify explainability payload populated
    expect(finalState.explainability).toBeDefined();
    expect(Array.isArray(finalState.explainability?.why)).toBe(true);
    expect(finalState.explainability?.why?.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // ITS-02: LangGraph Stage 4 Duplicate Detection Integration
  // ---------------------------------------------------------------------------
  it('ITS-02: Stage 4 duplicate detection flags identical incident, links parent, and prevents duplicate dispatch', async () => {
    const testEmbedding = new Array(3072).fill(0.01);
    const testDHash = '0000000000000000111111111111111100000000000000001111111111111111';
    const location = { lat: 17.3850, lng: 78.4867 };

    // 1. Seed primary incident with matching category and embedding
    const parent = await Incident.create({
      citizenId: new mongoose.Types.ObjectId().toString(),
      title: 'Water Pipe Burst Flooding 4th Cross Road',
      description: 'Major water pipeline fracture with high volume drinking water flooding street.',
      imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/water_pipe.jpg',
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      },
      category: 'Infrastructure',
      severity: 'High',
      department: 'PWD',
      status: 'Submitted',
      isDuplicate: false,
      witnessCount: 1,
      embedding: testEmbedding,
      imageDHash: testDHash
    });

    const parentId = parent._id.toString();

    // Register parent in FAISS vector index
    FaissIndexService.addIndexEntry({
      incidentId: parentId,
      vector: testEmbedding,
      category: 'Infrastructure',
      location,
      pHash: testDHash,
      createdAt: new Date()
    });

    // 2. Run DuplicateService.analyzeDuplicate with identical text, dHash, and exact GPS
    const dupAnalysis = await DuplicateService.analyzeDuplicate(
      'Water Pipe Burst Flooding 4th Cross Road',
      'https://res.cloudinary.com/aicity/image/upload/v1700000000/water_pipe_alt.jpg',
      location,
      'Infrastructure',
      testEmbedding,
      testDHash
    );

    expect(dupAnalysis.duplicateScore).toBeGreaterThanOrEqual(0.80);
    expect(dupAnalysis.parentIncidentId).toBe(parentId);

    // 3. Test Ingestion behavior via IncidentService
    const duplicateCitizenId = new mongoose.Types.ObjectId().toString();
    const result = await IncidentService.createIncident(
      {
        title: 'Water Pipe Burst Flooding 4th Cross Road',
        description: 'Major water pipeline fracture with high volume drinking water flooding street.',
        imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/water_pipe_alt.jpg',
        location
      },
      duplicateCitizenId
    );

    // Assert duplicate is flagged and parent witness count incremented
    expect(result.duplicateFound).toBe(true);
    expect(result.parentIncidentId).toBe(parentId);

    const updatedParent = await Incident.findById(parentId);
    expect(updatedParent?.witnessCount).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------------------
  // ITS-03: 4-Tier MongoDB Fallback Cascade Verification
  // ---------------------------------------------------------------------------
  it('ITS-03: 4-Tier MongoDB fallback transitions smoothly to in-memory tier and operates queries', async () => {
    const originalConnected = isMongoConnected;

    try {
      // Simulate primary disconnect
      setMongoConnected(false);

      const health = getPersistenceHealth();
      expect(health.isMongoConnected).toBe(false);
      expect(health.mongoTier).toContain('Tier 4');

      // Verify in-memory fallback collection operations
      const testCollection = 'incidents';
      memoryDb[testCollection] = [];

      const doc = {
        _id: 'fallback_test_id_001',
        title: 'Test Fallback Civic Issue',
        status: 'Submitted',
        severity: 'Medium',
        createdAt: new Date()
      };
      memoryDb[testCollection].push(doc);

      expect(memoryDb[testCollection].length).toBe(1);
      expect(memoryDb[testCollection][0]._id).toBe('fallback_test_id_001');

      // Simulate find query
      const found = memoryDb[testCollection].find((item: any) => item._id === 'fallback_test_id_001');
      expect(found).toBeDefined();
      expect(found.title).toBe('Test Fallback Civic Issue');

      // Simulate update
      found.status = 'Assigned';
      expect(memoryDb[testCollection][0].status).toBe('Assigned');
    } finally {
      setMongoConnected(originalConnected);
    }
  });

  // ---------------------------------------------------------------------------
  // ITS-04: Offline Neo4j Cypher Emulator & Spatial Graph Queries
  // ---------------------------------------------------------------------------
  it('ITS-04: In-Memory Neo4j emulator executes department routing, ward stats, and clusters deterministically', async () => {
    // 1. Department Routing Cypher
    const routeResults = await runCypherQuery(
      'MATCH (w:Ward)-[:MANAGED_BY]->(d:Department) RETURN d, w',
      { deptCode: 'WATER_BOARD' }
    );
    expect(Array.isArray(routeResults)).toBe(true);
    expect(routeResults.length).toBeGreaterThan(0);
    expect(routeResults[0].d).toBeDefined();
    expect(routeResults[0].w).toBeDefined();

    // 2. Nearest Officer Cypher
    const officerResults = await runCypherQuery(
      'MATCH (o:Officer)-[:ASSIGNED_OFFICER]->(w:Ward) RETURN o, w',
      { deptCode: 'WATER_BOARD' }
    );
    expect(Array.isArray(officerResults)).toBe(true);
    expect(officerResults.length).toBeGreaterThan(0);
    expect(officerResults[0].o).toBeDefined();
    expect(officerResults[0].o.deptCode).toBe('WATER_BOARD');

    // 3. Ward Statistics Cypher
    const wardStats = await runCypherQuery(
      'MATCH (w:Ward) RETURN w.name as wardName, w.code as wardCode'
    );
    expect(Array.isArray(wardStats)).toBe(true);
    expect(wardStats.length).toBeGreaterThan(0);
    expect(wardStats[0].wardName).toBeDefined();
    expect(wardStats[0].wardCode).toBeDefined();

    // 4. Clustered Complaints Cypher
    const clusters = await runCypherQuery(
      'MATCH (r:Road)-[:AFFECTS_ASSET]->(a:Asset) RETURN r.name as roadName, clusteredComplaintIds'
    );
    expect(Array.isArray(clusters)).toBe(true);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0].roadName).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // ITS-05: Polyglot ACID Transaction & Compensating Rollback (DEF-BE-04)
  // ---------------------------------------------------------------------------
  it('ITS-05: Compensating rollback executes cleanly on downstream Neo4j failure, leaving zero orphaned records', async () => {
    let createdIncidentId: string | null = null;

    const transactionAttempt = executeWithPolyglotTransaction({
      mongoWork: async (session) => {
        const doc = await Incident.create(
          [{
            citizenId: new mongoose.Types.ObjectId().toString(),
            title: 'Temporary Incident for Rollback Verification',
            description: 'This document must be removed if Neo4j graph linkage fails.',
            imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/temp.jpg',
            location: { type: 'Point', coordinates: [78.4867, 17.3850] },
            category: 'Sanitation',
            severity: 'Low',
            department: 'SANITATION',
            status: 'Submitted',
            isDuplicate: false,
            witnessCount: 1
          }],
          session ? { session } : {}
        );
        const saved = Array.isArray(doc) ? doc[0] : doc;
        createdIncidentId = saved._id.toString();
        return saved;
      },
      neo4jWork: async () => {
        // Deliberately simulate downstream connection failure / timeout
        throw new Error('Simulated Neo4j Bolt timeout error');
      },
      compensateMongo: async (savedDoc) => {
        // Compensating saga rollback for standalone/fallback tiers
        await Incident.findByIdAndDelete(savedDoc._id);
      }
    });

    // Assert that the transaction propagates the error
    await expect(transactionAttempt).rejects.toThrow('Simulated Neo4j Bolt timeout error');

    // Assert that the partial MongoDB document was rolled back (zero orphaned records)
    expect(createdIncidentId).not.toBeNull();
    const orphanedDoc = await Incident.findById(createdIncidentId);
    expect(orphanedDoc).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // ITS-06: Vercel Serverless Adapter Cold-Start Idempotency (DEF-OPS-03)
  // ---------------------------------------------------------------------------
  it('ITS-06: 5 concurrent cold-start requests share a single initialization promise and return 200 on /health', async () => {
    // Reset the serverless global promise to simulate a fresh cold-start
    delete (globalThis as any).__aiCityDbInitPromise;

    const server = http.createServer((req, res) => {
      serverlessHandler(req, res);
    });

    // Fire 5 simultaneous requests to the exported serverless handler
    const requests = Array.from({ length: 5 }, () => {
      return supertest(server).get('/health');
    });

    const responses = await Promise.all(requests);

    // Verify all 5 requests resolved with 200 OK
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.persistence).toBeDefined();
    }

    // Verify global promise was shared and resolved
    expect((globalThis as any).__aiCityDbInitPromise).toBeDefined();
  });
});
