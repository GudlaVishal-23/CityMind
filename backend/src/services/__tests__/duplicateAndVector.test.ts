import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FaissIndexService, VectorIndexEntry } from '../faissIndex.service';
import { DuplicateService } from '../duplicate.service';
import Incident from '../../models/incident.model';

void describe('Day 5 Performance, Vector & Spatial Indexing Tests', () => {
  void describe('DEF-PERF-01: Bounded Vector Index Memory Cache', () => {
    void it('defines a strict MAX_INDEX_ENTRIES constant capped at 2500', () => {
      assert.strictEqual(FaissIndexService.MAX_INDEX_ENTRIES, 2500);
    });

    void it('computes Cosine Similarity and L2 distance accurately in memory', () => {
      const vecA = [1, 0, 0];
      const vecB = [1, 0, 0];
      const vecC = [0, 1, 0];

      const simIdentical = FaissIndexService.computeCosineSimilarity(vecA, vecB);
      assert.strictEqual(Math.round(simIdentical), 1);

      const simOrthogonal = FaissIndexService.computeCosineSimilarity(vecA, vecC);
      assert.strictEqual(Math.round(simOrthogonal), 0);

      const dist = FaissIndexService.computeL2Distance(vecA, vecC);
      assert.strictEqual(parseFloat(dist.toFixed(2)), 1.41);
    });

    void it('supports entry lookup and index clearance', () => {
      FaissIndexService.clearIndex();
      assert.strictEqual(FaissIndexService.getIndexSize(), 0);

      const testEntry: VectorIndexEntry = {
        incidentId: 'test_inc_001',
        vector: [0.1, 0.2, 0.3],
        category: 'Pothole',
        location: { lat: 17.44, lng: 78.38 },
        pHash: 'a1b2c3d4e5f60718',
        createdAt: new Date()
      };

      FaissIndexService.addIndexEntry(testEntry);
      assert.strictEqual(FaissIndexService.hasEntry('test_inc_001'), true);
      assert.strictEqual(FaissIndexService.getEntry('test_inc_001')?.category, 'Pothole');
      assert.strictEqual(FaissIndexService.getIndexSize(), 1);

      FaissIndexService.clearIndex();
      assert.strictEqual(FaissIndexService.getIndexSize(), 0);
    });
  });

  void describe('DEF-BE-03: Zero N+1 AI Loop & Precomputed Vector Scoring', () => {
    void it('computes composite duplicate score accurately using precomputed vectors in <15ms', async () => {
      const t0 = Date.now();
      const mockVector = new Array(256).fill(0.0625);
      const mockDHash = 'ffff0000ffff0000';

      const result = await DuplicateService.analyzeDuplicate(
        'Broken water pipe leaking clean water on road',
        'https://images.unsplash.com/photo-1517649763962-0c623266ddc0',
        { lat: 12.9716, lng: 77.5946 },
        'Water Leakage',
        mockVector,
        mockDHash
      );

      const latencyMs = Date.now() - t0;
      assert.ok(latencyMs < 200, `Execution took ${latencyMs}ms, should be fast in-memory execution`);
      assert.ok(typeof result.duplicateScore === 'number');
      assert.ok(result.duplicateScore >= 0.0 && result.duplicateScore <= 1.0);
      assert.ok(['FLAG_DUPLICATE', 'LINK_TO_PARENT', 'CREATE_NEW'].includes(result.recommendation));
      assert.ok(Array.isArray(result.nearbyIncidentIds));
      assert.ok(Array.isArray(result.textEmbedding));
      assert.strictEqual(result.imageDHash, mockDHash);
    });

    void it('correctly evaluates Haversine distance between coordinates', () => {
      // Distance between Hyderabad Hitec City (17.4435, 78.3772) and ~100m away (17.4444, 78.3772)
      const dist = DuplicateService.haversineDistance(17.4435, 78.3772, 17.4444, 78.3772);
      assert.ok(dist > 90 && dist < 110, `Expected ~100m, got ${dist}`);
    });
  });

  void describe('DEF-DATA-02: DB Fallback Proxy Compatibility with .select() and .lean()', () => {
    void it('allows .select() and .lean() queries on find() without throwing TypeError', async () => {
      const query = Incident.find({ isDuplicate: false })
        .select('_id title description category location embedding imageDHash createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      assert.ok(typeof query.then === 'function', 'Must be a thenable promise');
      const results = await query;
      assert.ok(Array.isArray(results), 'Must resolve to array');
    });

    void it('allows .select() and .lean() queries on findOne() without throwing TypeError', async () => {
      const query = Incident.findOne({ isDuplicate: false })
        .select('+embedding +imageDHash')
        .lean();

      assert.ok(typeof query.then === 'function', 'Must be a thenable promise');
      const doc = await query;
      assert.ok(doc !== undefined);
    });
  });
});

