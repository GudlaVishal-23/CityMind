import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { createTestContext, TOKENS } from '../helpers/testApp';
import Incident from '../../src/models/incident.model';
import DuplicateService from '../../src/services/duplicate.service';
import FaissIndexService from '../../src/services/faissIndex.service';
import { memoryDb, MAX_FALLBACK_RECORDS, enforceCollectionCapacity } from '../../src/config/dbFallback';

describe('Day 9 PTS: Performance Budgets & Concurrency Scaling Tests (PTS-01 to PTS-04)', () => {
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
    // Pre-sync test user profiles in MongoDB to avoid concurrent registration collisions
    await ctx.request.post('/api/auth/sync').set(ctx.authHeader(TOKENS.CITIZEN_A));
    await ctx.request.post('/api/auth/sync').set(ctx.authHeader(TOKENS.ADMIN_1));
  });

  // ---------------------------------------------------------------------------
  // PTS-01: 50-Concurrency Incident Ingestion Latency (p95 < 1500ms)
  // ---------------------------------------------------------------------------
  it('PTS-01: 50 concurrent incident submissions return 201/200 with p95 latency < 1500ms', async () => {
    const concurrency = 50;
    const latencies: number[] = [];

    const requests = Array.from({ length: concurrency }, (_, i) => {
      return (async () => {
        const start = Date.now();
        const res = await ctx.request
          .post('/api/incidents')
          .set(ctx.authHeader(TOKENS.CITIZEN_A))
          // x-test-rate-limit omitted so rate-limit bypass allows concurrency test to run
          .send({
            title: `Concurrent Hazard Submission #${i} 12345`,
            description: `Roadway obstruction causing disruption near traffic junction #${i}`,
            imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/hazard.jpg',
            location: {
              lat: 17.3850 + (i * 0.0005),
              lng: 78.4867 + (i * 0.0005)
            }
          });
        const elapsed = Date.now() - start;
        latencies.push(elapsed);
        return res;
      })();
    });

    const responses = await Promise.all(requests);

    // Verify 50/50 requests succeeded (no 500 errors)
    for (const res of responses) {
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    }

    // Compute p95 latency
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index];

    expect(p95Latency).toBeLessThan(1500);
  });

  // ---------------------------------------------------------------------------
  // PTS-02: O(1) Precomputed Duplicate Scaling Benchmark (DEF-BE-03)
  // ---------------------------------------------------------------------------
  it('PTS-02: Duplicate check across 250 seeded incidents completes in < 150ms with O(1) embedding calls', async () => {
    // 1. Seed 250 historical incidents with precomputed embeddings and dHash
    const baseEmbedding = new Array(3072).fill(0.02);
    const baseDHash = '1111000011110000111100001111000011110000111100001111000011110000';

    const incidentsToSeed = Array.from({ length: 250 }, (_, i) => ({
      citizenId: new mongoose.Types.ObjectId().toString(),
      title: `Historical Incident #${i} on Ring Road`,
      description: `Civic grievance description for historical ticket #${i}`,
      imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/seed.jpg',
      location: {
        type: 'Point',
        coordinates: [78.4867 + (i * 0.001), 17.3850 + (i * 0.001)]
      },
      category: 'Infrastructure',
      severity: 'Medium',
      department: 'PWD',
      status: 'Submitted',
      isDuplicate: false,
      witnessCount: 1,
      embedding: baseEmbedding,
      imageDHash: baseDHash,
      createdAt: new Date(Date.now() - (i * 3600000))
    }));

    const inserted = await Incident.insertMany(incidentsToSeed);

    // Populate FAISS vector index (capped at 2500 per DEF-PERF-01)
    for (let i = 0; i < inserted.length; i++) {
      FaissIndexService.addIndexEntry({
        incidentId: inserted[i]._id.toString(),
        vector: baseEmbedding,
        category: 'Infrastructure',
        location: {
          lat: 17.3850 + (i * 0.001),
          lng: 78.4867 + (i * 0.001)
        },
        pHash: baseDHash,
        createdAt: inserted[i].createdAt
      });
    }

    // 2. Attach a Vitest spy to DuplicateService.generateEmbedding
    const embeddingSpy = vi.spyOn(DuplicateService, 'generateEmbedding');

    // 3. Submit 1 new incident report and benchmark duplicate analysis
    const queryStart = Date.now();
    const dupResult = await DuplicateService.analyzeDuplicate(
      'New Incident Candidate for Duplicate Check',
      'https://res.cloudinary.com/aicity/image/upload/v1700000000/new.jpg',
      { lat: 17.3850, lng: 78.4867 },
      'Infrastructure',
      baseEmbedding, // Precomputed embedding passed directly
      baseDHash      // Precomputed dHash passed directly
    );
    const queryDuration = Date.now() - queryStart;

    // (a) Strictly O(1): embeddingSpy called at most 1 time (zero N+1 embedding loops over 250 items)
    expect(embeddingSpy).toHaveBeenCalledTimes(0); // 0 because precomputed embedding was passed
    embeddingSpy.mockRestore();

    // (b) Duplicate lookup completes in < 150ms
    expect(queryDuration).toBeLessThan(150);
    expect(dupResult).toBeDefined();
    expect(dupResult.duplicateScore).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // PTS-03: Bounded Heap & Fallback Eviction Under Heavy Load (DEF-DATA-01)
  // ---------------------------------------------------------------------------
  it('PTS-03: Sustained ingestion past MAX_FALLBACK_RECORDS enforces FIFO/LRU eviction and bounds heap growth', async () => {
    const initialHeap = process.memoryUsage().heapUsed;
    const testCollection = 'incidents';

    // Seed up to MAX_FALLBACK_RECORDS (5,000)
    memoryDb[testCollection] = [];
    for (let i = 0; i < MAX_FALLBACK_RECORDS; i++) {
      memoryDb[testCollection].push({
        _id: `rec_${i}`,
        title: `Pre-existing incident ${i}`,
        status: 'Submitted',
        createdAt: new Date(Date.now() - (MAX_FALLBACK_RECORDS - i) * 1000)
      });
    }

    expect(memoryDb[testCollection].length).toBe(MAX_FALLBACK_RECORDS);

    // Now insert 500 additional records beyond capacity
    for (let i = 0; i < 500; i++) {
      memoryDb[testCollection].push({
        _id: `overflow_rec_${i}`,
        title: `Overflow incident payload with metadata padding ${i}`,
        payloadPadding: 'A'.repeat(512),
        status: 'Submitted',
        createdAt: new Date()
      });
      enforceCollectionCapacity(testCollection);
    }

    // 1. Capacity must strictly not exceed MAX_FALLBACK_RECORDS (FIFO eviction of oldest items)
    expect(memoryDb[testCollection].length).toBeLessThanOrEqual(MAX_FALLBACK_RECORDS);

    // Oldest items (rec_0 through rec_499) must have been evicted
    const firstRemaining = memoryDb[testCollection][0];
    expect(firstRemaining._id).not.toBe('rec_0');

    // 2. Heap growth delta remains strictly bounded (< 120 MB)
    const finalHeap = process.memoryUsage().heapUsed;
    const heapGrowthMb = (finalHeap - initialHeap) / (1024 * 1024);
    expect(heapGrowthMb).toBeLessThan(120);
  });

  // ---------------------------------------------------------------------------
  // PTS-04: Indexed Spatial & Filtered Pagination Query Scaling (DEF-DATA-02)
  // ---------------------------------------------------------------------------
  it('PTS-04: 20 concurrent filtered queries across 300 incidents return 200 OK in < 200ms per request', async () => {
    // 1. Seed 300 incidents across diverse statuses and categories
    const categories = ['Infrastructure', 'Water Infrastructure', 'Sanitation', 'Electricity'];
    const statuses = ['Submitted', 'Assigned', 'In_Progress', 'Resolved'];

    const batch = Array.from({ length: 300 }, (_, i) => ({
      citizenId: new mongoose.Types.ObjectId().toString(),
      title: i % 4 === 0 ? `Sparking transformer hazard #${i}` : `Standard roadway defect #${i}`,
      description: i % 4 === 0
        ? `Electrical transformer arcing with sparks on pole #${i}`
        : `Civic pothole requiring maintenance on road #${i}`,
      imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/civic.jpg',
      location: {
        type: 'Point',
        coordinates: [78.4867 + ((i % 50) * 0.002), 17.3850 + ((i % 50) * 0.002)]
      },
      category: categories[i % categories.length],
      severity: 'High',
      department: 'ELECTRICITY',
      status: statuses[i % statuses.length],
      isDuplicate: false,
      witnessCount: 1,
      createdAt: new Date(Date.now() - (i * 60000))
    }));

    await Incident.insertMany(batch);

    // 2. Fire 20 concurrent filtered queries with text search, status filter, and pagination
    const concurrentQueries = Array.from({ length: 20 }, () => {
      return (async () => {
        const start = Date.now();
        const res = await ctx.request
          .get('/api/incidents?all=true&status=Assigned&limit=25&page=1&search=transformer')
          .set(ctx.authHeader(TOKENS.ADMIN_1));
        const duration = Date.now() - start;
        return { res, duration };
      })();
    });

    const results = await Promise.all(concurrentQueries);

    // 3. Verify each query returns 200 OK with correct pagination structure in < 200ms
    for (const { res, duration } of results) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(25);
      expect(Array.isArray(res.body.data.incidents)).toBe(true);
      expect(duration).toBeLessThan(200);
    }
  });
});
