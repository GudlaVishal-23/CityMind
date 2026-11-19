import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import IncidentController from '../src/controllers/incident.controller';
import GraphController from '../src/controllers/graph.controller';
import notificationRoutes from '../src/routes/notification.routes';
import graphRoutes from '../src/routes/graph.routes';

async function runTests() {
  console.log('--- RUNNING DAY 2 SECURITY INVARIANT EMPIRICAL VERIFICATION ---');

  process.env.NODE_ENV = 'development';
  process.env.ENABLE_DEV_AUTH = 'true';

  // 1. DEF-SEC-04: Incident Tenant Isolation & ?all=true gating
  const app1 = express();
  app1.use(express.json());
  app1.use((req, res, next) => {
    const role = (req.headers['x-test-role'] as 'citizen' | 'officer' | 'admin') || 'citizen';
    req.user = {
      id: new mongoose.Types.ObjectId().toString(),
      firebaseUid: 'test-citizen-uid',
      email: 'citizen@aicity.gov',
      name: 'Test Citizen',
      role
    };
    next();
  });
  app1.get('/api/incidents', IncidentController.getIncidents);

  const server1 = http.createServer(app1);
  await new Promise<void>((resolve) => server1.listen(5091, resolve));

  try {
    const res1 = await fetch('http://127.0.0.1:5091/api/incidents?all=true', {
      headers: { 'x-test-role': 'citizen' }
    });
    if (res1.status === 403) {
      const data: any = await res1.json();
      console.log('  [PASS] DEF-SEC-04: Citizen ?all=true correctly rejected with HTTP 403 Forbidden:', data.error);
    } else {
      throw new Error(`DEF-SEC-04 Failed: Expected 403, got ${res1.status}`);
    }
  } finally {
    server1.close();
  }

  // 2. DEF-SEC-06: Notification IDOR & ObjectId validation
  const app2 = express();
  app2.use(express.json());
  app2.use('/api/notifications', notificationRoutes);

  const server2 = http.createServer(app2);
  await new Promise<void>((resolve) => server2.listen(5092, resolve));

  try {
    const res2 = await fetch('http://127.0.0.1:5092/api/notifications/invalid-object-id/read', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer dev-citizen' }
    });
    if (res2.status === 400) {
      const data: any = await res2.json();
      console.log('  [PASS] DEF-SEC-06: Invalid ObjectId rejected with HTTP 400 Bad Request:', data.error);
    } else {
      throw new Error(`DEF-SEC-06 Failed: Expected 400, got ${res2.status}`);
    }
  } finally {
    server2.close();
  }

  // 3. DEF-SEC-07: Graph Officer PII Protection & Role Gating
  const app3 = express();
  app3.use(express.json());
  app3.use('/api/graph', graphRoutes);

  const server3 = http.createServer(app3);
  await new Promise<void>((resolve) => server3.listen(5093, resolve));

  try {
    // 3A: Citizen requesting nearest officers -> 403 Forbidden
    const res3A = await fetch('http://127.0.0.1:5093/api/graph/officers/nearest', {
      headers: { Authorization: 'Bearer dev-citizen' }
    });
    if (res3A.status === 403) {
      console.log('  [PASS] DEF-SEC-07: Citizen accessing /api/graph/officers/nearest rejected with HTTP 403 Forbidden');
    } else {
      throw new Error(`DEF-SEC-07 Role Check Failed: Expected 403, got ${res3A.status}`);
    }

    // 3B: Officer requesting nearest officers -> 200 OK with sanitized PII
    const res3B = await fetch('http://127.0.0.1:5093/api/graph/officers/nearest?department=WATER_BOARD', {
      headers: { Authorization: 'Bearer dev-officer' }
    });
    if (res3B.status === 200) {
      const body: any = await res3B.json();
      const officers = body.data?.officers || [];
      const hasPhone = officers.some((o: any) => o.phone !== undefined);
      const hasEmail = officers.some((o: any) => o.email !== undefined);
      const hasBadge = officers.every((o: any) => typeof o.badgeNumber === 'string');

      if (!hasPhone && !hasEmail && hasBadge && officers.length > 0) {
        console.log('  [PASS] DEF-SEC-07: Officer payload strictly sanitized (badgeNumber present, zero phone/email PII)');
      } else {
        throw new Error('DEF-SEC-07 PII check failed: Sensitive phone or email leaked in payload');
      }
    } else {
      throw new Error(`DEF-SEC-07 Officer Query Failed: Expected 200, got ${res3B.status}`);
    }
  } finally {
    server3.close();
  }

  console.log('--- ALL DAY 2 SECURITY INVARIANTS EMPIRICALLY CONFIRMED (100% PASS) ---');
}

runTests().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
