import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createTestContext, TOKENS } from '../helpers/testApp';
import Incident from '../../src/models/incident.model';
import Notification from '../../src/models/notification.model';
import NotificationService from '../../src/services/notification.service';

describe('Day 8 STS: Security Regression & OWASP Invariant Tests (STS-01 to STS-06)', () => {
  const ctx = createTestContext();

  beforeAll(async () => {
    await ctx.setup();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  beforeEach(async () => {
    await ctx.resetDatabase();
  });

  // ---------------------------------------------------------------------------
  // STS-01: DEF-SEC-02 — Production dev-admin Bypass Lockdown
  // ---------------------------------------------------------------------------
  it('STS-01: Production mode strictly blocks dev-* token bypasses with 401 Unauthorized', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDevAuth = process.env.ENABLE_DEV_AUTH;

    try {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_DEV_AUTH = 'false';

      // 1. Attempt privileged analytics endpoint with dev-admin token
      const analyticsRes = await ctx.request
        .get('/api/analytics/health')
        .set({ Authorization: 'Bearer dev-admin' });
      expect(analyticsRes.status).toBe(401);
      expect(analyticsRes.body.success).toBe(false);

      // 2. Attempt admin override with dev-admin token
      const dummyId = new mongoose.Types.ObjectId().toString();
      const overrideRes = await ctx.request
        .patch(`/api/incidents/${dummyId}/override`)
        .set({ Authorization: 'Bearer dev-admin' })
        .send({ severity: 'Critical', reason: 'Attempted unauthorized escalation' });
      expect(overrideRes.status).toBe(401);
      expect(overrideRes.body.success).toBe(false);
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.ENABLE_DEV_AUTH = prevDevAuth;
    }
  });

  // ---------------------------------------------------------------------------
  // STS-02: DEF-SEC-03 — CORS Reflection Attack Blocked
  // ---------------------------------------------------------------------------
  it('STS-02: CORS rejects untrusted origins (evil-phishing-site.com) and permits whitelisted origins', async () => {
    // 1. Untrusted origin -> rejected (403 or disallowed header)
    const blockedRes = await ctx.request
      .get('/health')
      .set('Origin', 'https://evil-phishing-site.com');

    // Either 403 or Origin header is omitted / not reflected
    const allowOriginHeader = blockedRes.headers['access-control-allow-origin'];
    expect(allowOriginHeader).not.toBe('https://evil-phishing-site.com');

    // 2. Authorized origin (http://localhost:5173) -> permitted with CORS header
    const allowedRes = await ctx.request
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  // ---------------------------------------------------------------------------
  // STS-03: DEF-SEC-04 & DEF-SEC-07 — Tenant Isolation & Officer PII Protection
  // ---------------------------------------------------------------------------
  it('STS-03: Citizen ?all=true rejected with 403, zero cross-tenant leak; officer directory redacts raw phone/auth', async () => {
    // Seed citizen-a incident
    const syncA = await ctx.request.post('/api/auth/sync').set(ctx.authHeader(TOKENS.CITIZEN_A));
    const citizenAId = syncA.body.data.id;

    const incA = await Incident.create({
      citizenId: citizenAId,
      title: 'Pothole owned by Citizen A',
      description: 'Dangerous road damage on 1st avenue',
      imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/a.jpg',
      location: { type: 'Point', coordinates: [78.4867, 17.3850] },
      category: 'Infrastructure',
      severity: 'Medium',
      department: 'PWD',
      status: 'Submitted',
      isDuplicate: false
    });

    // Seed citizen-b incident
    const syncB = await ctx.request.post('/api/auth/sync').set(ctx.authHeader(TOKENS.CITIZEN_B));
    const citizenBId = syncB.body.data.id;

    await Incident.create({
      citizenId: citizenBId,
      title: 'Private grievance owned by Citizen B',
      description: 'Secret issue reported by Citizen B',
      imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/b.jpg',
      location: { type: 'Point', coordinates: [78.4867, 17.3850] },
      category: 'Sanitation',
      severity: 'Low',
      department: 'SANITATION',
      status: 'Submitted',
      isDuplicate: false
    });

    // 1. Citizen A attempting ?all=true is strictly forbidden (403)
    const allQueryRes = await ctx.request
      .get('/api/incidents?all=true')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(allQueryRes.status).toBe(403);
    expect(allQueryRes.body.error).toContain('Forbidden');

    // 2. Normal query as Citizen A returns only Citizen A's incident
    const isolatedRes = await ctx.request
      .get('/api/incidents')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(isolatedRes.status).toBe(200);
    const incidents = isolatedRes.body.data.incidents;
    expect(incidents.length).toBe(1);
    expect(incidents[0]._id).toBe(incA._id.toString());
    expect(incidents[0].citizenId).toBe(citizenAId);

    // 3. Citizen cannot view officer contact graph -> 403 Forbidden
    const citGraphRes = await ctx.request
      .get('/api/graph/officers/nearest')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(citGraphRes.status).toBe(403);

    // 4. Admin query to officer graph returns sanitized fields (zero raw phone/auth)
    const adminGraphRes = await ctx.request
      .get('/api/graph/officers/nearest')
      .set(ctx.authHeader(TOKENS.ADMIN_1));
    expect(adminGraphRes.status).toBe(200);
    const officers = adminGraphRes.body.data.officers;
    expect(officers.length).toBeGreaterThan(0);
    for (const officer of officers) {
      expect(officer.badgeNumber).toBeDefined();
      expect(officer.department).toBeDefined();
      expect(officer.distanceKm).toBeDefined();
      // Verify sensitive PII is redacted
      expect(officer.phone).toBeUndefined();
      expect(officer.password).toBeUndefined();
      expect(officer.firebaseUid).toBeUndefined();
    }
  });

  // ---------------------------------------------------------------------------
  // STS-04: DEF-SEC-06 — Notification Cross-Tenant IDOR Blocked
  // ---------------------------------------------------------------------------
  it('STS-04: Citizen B cannot mark Citizen A notification as read (404 Not Found IDOR defense)', async () => {
    const syncA = await ctx.request.post('/api/auth/sync').set(ctx.authHeader(TOKENS.CITIZEN_A));
    const citizenAId = syncA.body.data.id;

    // Create unread notification for Citizen A
    const dummyIncidentId = new mongoose.Types.ObjectId().toString();
    await NotificationService.create(
      citizenAId,
      dummyIncidentId,
      'complaint_submitted',
      'Your complaint has been submitted successfully.'
    );

    const notifA = await Notification.findOne({ userId: citizenAId, read: false });
    expect(notifA).not.toBeNull();
    const notifId = notifA!._id.toString();

    // Citizen B attempts to mark Citizen A's notification as read
    const idorRes = await ctx.request
      .patch(`/api/notifications/${notifId}/read`)
      .set(ctx.authHeader(TOKENS.CITIZEN_B));

    // Must return 404 Not Found to prevent tenant ID enumeration
    expect(idorRes.status).toBe(404);

    // Verify in database that Citizen A's notification remains unread
    const notifCheck = await Notification.findById(notifId);
    expect(notifCheck?.read).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // STS-05: DEF-SEC-05 & DEF-BE-05 — SSRF & ReDoS Attack Defenses
  // ---------------------------------------------------------------------------
  it('STS-05: Rejects SSRF cloud metadata and loopback URLs with 400; neutralizes ReDoS pattern in < 200ms', async () => {
    // 1. SSRF Cloud Metadata IP (169.254.169.254) -> 400 Bad Request
    const ssrfMetadataRes = await ctx.request
      .post('/api/incidents')
      .set(ctx.authHeader(TOKENS.CITIZEN_A))
      .send({
        title: 'Hazardous Pothole Roadway',
        description: 'Deep dangerous hole causing traffic congestion on road',
        imageUrl: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
        location: { lat: 17.3850, lng: 78.4867 }
      });
    expect(ssrfMetadataRes.status).toBe(400);
    expect(ssrfMetadataRes.body.success).toBe(false);

    // 2. SSRF Loopback IP (127.0.0.1) -> 400 Bad Request
    const ssrfLoopbackRes = await ctx.request
      .post('/api/incidents')
      .set(ctx.authHeader(TOKENS.CITIZEN_A))
      .send({
        title: 'Hazardous Pothole Roadway',
        description: 'Deep dangerous hole causing traffic congestion on road',
        imageUrl: 'http://127.0.0.1:5000/health',
        location: { lat: 17.3850, lng: 78.4867 }
      });
    expect(ssrfLoopbackRes.status).toBe(400);
    expect(ssrfLoopbackRes.body.success).toBe(false);

    // 3. ReDoS Catastrophic Backtracking Query -> executes safely in < 200ms
    const start = Date.now();
    const redosRes = await ctx.request
      .get('/api/incidents?search=^(([a-z])+.)+[A-Z]([a-z])+$')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    const durationMs = Date.now() - start;

    expect(redosRes.status).toBe(200);
    expect(durationMs).toBeLessThan(200);
  });

  // ---------------------------------------------------------------------------
  // STS-06: DEF-OPS-04 — Rate Limiting & Scoped Body Size Limits
  // ---------------------------------------------------------------------------
  it('STS-06: Enforces 30 req/min rate limit with 429 and blocks > 2MB payloads with 413', async () => {
    // 1. Rate Limiting burst test on POST /api/incidents
    let rateLimited = false;
    let rateLimitHeaderFound = false;

    for (let i = 0; i < 33; i++) {
      const res = await ctx.request
        .post('/api/incidents')
        .set(ctx.authHeader(TOKENS.CITIZEN_A))
        .set('x-test-rate-limit', 'true')
        .send({
          title: `Rapid Report Burst Number ${i} 12345`,
          description: 'Burst test payload for rate limit verification on civic hazard pipeline',
          imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/burst.jpg',
          location: { lat: 17.3850, lng: 78.4867 }
        });

      if (res.status === 429) {
        rateLimited = true;
        expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
        if (res.headers['ratelimit-limit']) {
          rateLimitHeaderFound = true;
        }
        break;
      }
    }
    expect(rateLimited).toBe(true);
    expect(rateLimitHeaderFound).toBe(true);

    // 2. Scoped Body Size Limit test (> 2MB on non-upload route /api/auth/sync)
    const largeString = 'x'.repeat(2.5 * 1024 * 1024); // 2.5MB string
    const oversizedRes = await ctx.request
      .post('/api/auth/sync')
      .set(ctx.authHeader(TOKENS.CITIZEN_A))
      .send({ data: largeString });

    expect(oversizedRes.status).toBe(413);
  });
});

