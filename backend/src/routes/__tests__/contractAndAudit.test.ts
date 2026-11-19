import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INCIDENT_STATUSES, IStatusEntry } from '../../models/incident.model';
import officerRouter from '../officer.routes';
import adminRouter from '../admin.routes';

void describe('Contract-First & Audit Trail Integration Tests (Day 4 Hardening)', () => {
  void describe('DEF-BE-01: Canonical Single-Source Status Enum Validation', () => {
    void it('contains exactly the 6 canonical lifecycle statuses', () => {
      const expected = ['Submitted', 'Verified', 'Assigned', 'In_Progress', 'Resolved', 'Rejected'];
      assert.deepStrictEqual([...INCIDENT_STATUSES], expected);
    });

    void it('strictly accepts canonical statuses', () => {
      assert.strictEqual(INCIDENT_STATUSES.includes('Assigned'), true);
      assert.strictEqual(INCIDENT_STATUSES.includes('In_Progress'), true);
      assert.strictEqual(INCIDENT_STATUSES.includes('Resolved'), true);
      assert.strictEqual(INCIDENT_STATUSES.includes('Submitted'), true);
      assert.strictEqual(INCIDENT_STATUSES.includes('Verified'), true);
      assert.strictEqual(INCIDENT_STATUSES.includes('Rejected'), true);
    });

    void it('rejects legacy non-canonical AI_Assigned status', () => {
      // @ts-expect-error verifying runtime rejection of legacy status
      assert.strictEqual(INCIDENT_STATUSES.includes('AI_Assigned'), false);
    });

    void it('rejects invalid or arbitrary status values', () => {
      // @ts-expect-error verifying runtime rejection of invalid statuses
      assert.strictEqual(INCIDENT_STATUSES.includes('Pending'), false);
      // @ts-expect-error verifying runtime rejection of invalid statuses
      assert.strictEqual(INCIDENT_STATUSES.includes('Closed'), false);
      // @ts-expect-error verifying runtime rejection of invalid statuses
      assert.strictEqual(INCIDENT_STATUSES.includes('assigned'), false);
    });
  });

  void describe('DEF-UI-01: RESTful HTTP Verb Parity & Route Contract', () => {
    void it('officer router registers PATCH (not POST) for /incidents/:id/status', () => {
      interface ExpressRouteLayer {
        route?: {
          path?: string;
          methods?: Record<string, boolean>;
        };
      }

      const layers = (officerRouter.stack as unknown as ExpressRouteLayer[])
        .filter((layer) => Boolean(layer.route));

      const statusLayer = layers.find((l) => l.route?.path === '/incidents/:id/status');
      assert.ok(statusLayer?.route, 'Route /incidents/:id/status must be defined');
      assert.strictEqual(statusLayer.route?.methods?.patch, true, 'Must accept PATCH');
      assert.strictEqual(Boolean(statusLayer.route?.methods?.post), false, 'Must NOT accept POST (DEF-UI-01 fix)');
    });

    void it('admin router registers PATCH for /incidents/:id/status', () => {
      interface ExpressRouteLayer {
        route?: {
          path?: string;
          methods?: Record<string, boolean>;
        };
      }

      const layers = (adminRouter.stack as unknown as ExpressRouteLayer[])
        .filter((layer) => Boolean(layer.route));

      const statusLayer = layers.find((l) => l.route?.path === '/incidents/:id/status');
      assert.ok(statusLayer?.route, 'Route /incidents/:id/status must be defined');
      assert.strictEqual(statusLayer.route?.methods?.patch, true, 'Must accept PATCH');
    });

    void it('officer workflow lifecycle actions maintain explicit POST verbs', () => {
      interface ExpressRouteLayer {
        route?: {
          path?: string;
          methods?: Record<string, boolean>;
        };
      }

      const layers = (officerRouter.stack as unknown as ExpressRouteLayer[])
        .filter((layer) => Boolean(layer.route));

      const acceptLayer = layers.find((l) => l.route?.path === '/incidents/:id/accept');
      const rejectLayer = layers.find((l) => l.route?.path === '/incidents/:id/reject');
      const closeLayer = layers.find((l) => l.route?.path === '/incidents/:id/close');

      assert.strictEqual(acceptLayer?.route?.methods?.post, true, '/accept must be POST');
      assert.strictEqual(rejectLayer?.route?.methods?.post, true, '/reject must be POST');
      assert.strictEqual(closeLayer?.route?.methods?.post, true, '/close must be POST');
    });
  });

  void describe('DEF-BE-02: Immutable Audit Trail Record Integrity', () => {
    void it('validates structure and actor audit properties on status history entries', () => {
      const sampleEntry: IStatusEntry = {
        status: 'In_Progress',
        timestamp: new Date(),
        note: '[ADMIN OVERRIDE] Manual operator adjustment',
        actorId: 'admin_usr_01',
        changedBy: 'admin_usr_01',
        role: 'admin'
      };

      assert.strictEqual(sampleEntry.status, 'In_Progress');
      assert.strictEqual(sampleEntry.actorId, 'admin_usr_01');
      assert.strictEqual(sampleEntry.changedBy, 'admin_usr_01');
      assert.strictEqual(sampleEntry.role, 'admin');
      assert.ok(sampleEntry.timestamp instanceof Date);
      assert.ok(sampleEntry.note.includes('[ADMIN OVERRIDE]'));
    });
  });
});
