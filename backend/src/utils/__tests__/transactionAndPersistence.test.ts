import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import app from '../../app';
import {
  executeWithPolyglotTransaction,
  supportsReplicaSet,
  resetReplicaSetDetectionCache
} from '../transaction';
import {
  memoryDb,
  MAX_FALLBACK_RECORDS,
  enforceCollectionCapacity,
  getPersistenceHealth as getMongoPersistenceHealth
} from '../../config/dbFallback';
import {
  memoryGraph,
  MAX_GRAPH_NODES,
  enforceGraphCapacity,
  getPersistenceHealth as getNeo4jPersistenceHealth
} from '../../config/neo4j';

void describe('Day 6: Distributed Polyglot Transactions, Serverless Cold-Start & Bounded Fallback Memory Tests', () => {
  void describe('DEF-BE-04: Polyglot Distributed Transaction Coordinator', () => {
    void it('detects replica set capability and resets cache correctly', async () => {
      resetReplicaSetDetectionCache();
      const hasReplicaSet = await supportsReplicaSet();
      assert.strictEqual(typeof hasReplicaSet, 'boolean');

      // Subsequent call should return cached result
      const cachedResult = await supportsReplicaSet();
      assert.strictEqual(cachedResult, hasReplicaSet);

      resetReplicaSetDetectionCache();
    });

    void it('successfully coordinates mongoWork and neo4jWork in fallback/standalone mode', async () => {
      let neo4jExecuted = false;

      const result = await executeWithPolyglotTransaction({
        mongoWork: async (session) => {
          assert.strictEqual(session, null, 'Session should be null in fallback/standalone tier');
          return { complaintId: 'complaint_test_101', status: 'Submitted' };
        },
        neo4jWork: async (mongoResult) => {
          assert.strictEqual(mongoResult.complaintId, 'complaint_test_101');
          neo4jExecuted = true;
        }
      });

      assert.strictEqual(result.complaintId, 'complaint_test_101');
      assert.strictEqual(result.status, 'Submitted');
      assert.strictEqual(neo4jExecuted, true);
    });

    void it('triggers compensating rollback when downstream neo4jWork throws an error', async () => {
      let compensationExecuted = false;
      let compensatedResult: { complaintId: string } | null = null;

      await assert.rejects(
        async () => {
          await executeWithPolyglotTransaction({
            mongoWork: async () => ({ complaintId: 'complaint_fail_202' }),
            neo4jWork: async () => {
              throw new Error('Neo4j Bolt connection severed during ingestion');
            },
            compensateMongo: async (mongoResult) => {
              compensationExecuted = true;
              compensatedResult = mongoResult;
            }
          });
        },
        /Neo4j Bolt connection severed/
      );

      assert.strictEqual(compensationExecuted, true, 'Compensating transaction must execute on downstream failure');
      assert.deepStrictEqual(compensatedResult, { complaintId: 'complaint_fail_202' });
    });

    void it('aborts immediately and bypasses downstream graph work if mongoWork fails', async () => {
      let neo4jExecuted = false;
      let compensateExecuted = false;

      await assert.rejects(
        async () => {
          await executeWithPolyglotTransaction({
            mongoWork: async () => {
              throw new Error('MongoDB constraint violation');
            },
            neo4jWork: async () => {
              neo4jExecuted = true;
            },
            compensateMongo: async () => {
              compensateExecuted = true;
            }
          });
        },
        /MongoDB constraint violation/
      );

      assert.strictEqual(neo4jExecuted, false, 'Neo4j work must not run if primary mongoWork fails');
      assert.strictEqual(compensateExecuted, false, 'Compensation must not run if primary work failed');
    });
  });

  void describe('DEF-DATA-01: Bounded Fallback Memory Stores & Eviction', () => {
    void it('enforces MAX_FALLBACK_RECORDS capacity with priority eviction of resolved/rejected records', () => {
      assert.strictEqual(MAX_FALLBACK_RECORDS, 5000);

      const testCollectionName = '__test_capacity_col__';
      memoryDb[testCollectionName] = [];

      try {
        // Pre-fill to 5000 items: first 4999 are In_Progress, 1 is Resolved at index 2500
        for (let i = 0; i < 5000; i++) {
          memoryDb[testCollectionName].push({
            _id: `item_${i}`,
            status: i === 2500 ? 'Resolved' : 'In_Progress',
            createdAt: new Date(Date.now() - (5000 - i) * 1000)
          });
        }

        assert.strictEqual(memoryDb[testCollectionName].length, 5000);

        // Enforce capacity: should evict the 'Resolved' record at index 2500
        enforceCollectionCapacity(testCollectionName);

        assert.strictEqual(memoryDb[testCollectionName].length, 4999);
        const resolvedRemaining = memoryDb[testCollectionName].filter(
          (doc: { status: string }) => doc.status === 'Resolved'
        );
        assert.strictEqual(resolvedRemaining.length, 0, 'Resolved record should be prioritized for eviction');

        // When no resolved/rejected records remain, pushing another item reaches capacity again
        // and FIFO should evict index 0 (oldest)
        const oldestBefore = memoryDb[testCollectionName][0]._id;
        memoryDb[testCollectionName].push({
          _id: 'new_item_5000',
          status: 'In_Progress',
          createdAt: new Date()
        });
        assert.strictEqual(memoryDb[testCollectionName].length, 5000);

        enforceCollectionCapacity(testCollectionName);
        assert.strictEqual(memoryDb[testCollectionName].length, 4999);
        assert.notStrictEqual(memoryDb[testCollectionName][0]._id, oldestBefore, 'FIFO must evict index 0');
      } finally {
        delete memoryDb[testCollectionName];
      }
    });

    void it('enforces MAX_GRAPH_NODES capacity in Neo4j in-memory emulator with priority eviction', () => {
      assert.strictEqual(MAX_GRAPH_NODES, 5000);

      const originalComplaints = [...memoryGraph.complaints];
      try {
        memoryGraph.complaints = [];
        for (let i = 0; i < 5000; i++) {
          memoryGraph.complaints.push({
            id: `complaint_node_${i}`,
            status: i === 1200 ? 'Resolved' : 'Verified'
          });
        }

        assert.strictEqual(memoryGraph.complaints.length, 5000);

        enforceGraphCapacity();

        assert.strictEqual(memoryGraph.complaints.length, 4999);
        const hasResolved = memoryGraph.complaints.some(c => c.status === 'Resolved');
        assert.strictEqual(hasResolved, false, 'Resolved graph complaint should be prioritized for eviction');

        // FIFO eviction when reaching capacity again with no resolved/rejected
        const oldestId = memoryGraph.complaints[0].id;
        memoryGraph.complaints.push({
          id: 'new_complaint_node_5000',
          status: 'Verified'
        });
        assert.strictEqual(memoryGraph.complaints.length, 5000);

        enforceGraphCapacity();
        assert.strictEqual(memoryGraph.complaints.length, 4999);
        assert.notStrictEqual(memoryGraph.complaints[0].id, oldestId, 'FIFO should evict oldest node');
      } finally {
        memoryGraph.complaints = originalComplaints;
      }
    });

    void it('provides accurate persistence telemetry via getMongoPersistenceHealth & getNeo4jPersistenceHealth', () => {
      const mongoHealth = getMongoPersistenceHealth();
      assert.ok(mongoHealth.mongoTier.length > 0);
      assert.strictEqual(typeof mongoHealth.isMongoConnected, 'boolean');
      assert.strictEqual(typeof mongoHealth.memoryRecordCount, 'number');
      assert.ok(mongoHealth.memoryRecordCount >= 0);

      const neo4jHealth = getNeo4jPersistenceHealth();
      assert.ok(['bolt', 'emulator'].includes(neo4jHealth.neo4jMode));
      assert.strictEqual(typeof neo4jHealth.isNeo4jConnected, 'boolean');
      assert.strictEqual(typeof neo4jHealth.memoryRecordCount, 'number');
      assert.ok(neo4jHealth.memoryRecordCount >= 0);
    });
  });

  void describe('DEF-OPS-03 & Telemetry: Live /health Endpoint Contract', () => {
    void it('exposes live persistence telemetry with HTTP 200 on /health', async () => {
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
      const port = (server.address() as AddressInfo).port;
      const url = `http://127.0.0.1:${port}/health`;

      try {
        const response = await fetch(url);
        assert.strictEqual(response.status, 200);

        const body = (await response.json()) as {
          status: string;
          timestamp: string;
          persistence: {
            mongoTier: string;
            isMongoConnected: boolean;
            mongoMemoryRecords: number;
            neo4jMode: string;
            isNeo4jConnected: boolean;
            graphMemoryNodes: number;
          };
        };

        assert.strictEqual(body.status, 'OK');
        assert.ok(body.timestamp);
        assert.ok(body.persistence);
        assert.strictEqual(typeof body.persistence.mongoTier, 'string');
        assert.strictEqual(typeof body.persistence.isMongoConnected, 'boolean');
        assert.strictEqual(typeof body.persistence.mongoMemoryRecords, 'number');
        assert.strictEqual(typeof body.persistence.neo4jMode, 'string');
        assert.strictEqual(typeof body.persistence.isNeo4jConnected, 'boolean');
        assert.strictEqual(typeof body.persistence.graphMemoryNodes, 'number');
      } finally {
        server.close();
      }
    });
  });
});
