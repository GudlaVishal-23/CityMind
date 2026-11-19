import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { createTestContext, TOKENS } from '../helpers/testApp';
import Incident from '../../src/models/incident.model';

describe('Day 8 ATS: API Boundary & Contract Enforcement Tests (ATS-01 to ATS-12)', () => {
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

  // Helper to create a standard incident in database
  async function seedIncident(overrides: Partial<any> = {}): Promise<any> {
    // Ensure citizen user profile exists in DB
    const citizenSync = await ctx.request
      .post('/api/auth/sync')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    const citizenId = citizenSync.body.data?.id || new mongoose.Types.ObjectId().toString();

    const incident = await Incident.create({
      citizenId,
      title: 'Water Pipe Burst on 5th Cross',
      description: 'Major drinking water pipe fractured causing street flooding and low pressure.',
      imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/water_leak.jpg',
      location: {
        type: 'Point',
        coordinates: [78.4867, 17.3850]
      },
      category: 'Water Infrastructure',
      severity: 'High',
      department: 'WATER_BOARD',
      status: 'Submitted',
      isDuplicate: false,
      witnessCount: 1,
      statusHistory: [{
        status: 'Submitted',
        timestamp: new Date(),
        note: 'Initial grievance submission',
        actorId: citizenId,
        changedBy: citizenId,
        role: 'citizen'
      }],
      ...overrides
    });
    return incident;
  }

  // ---------------------------------------------------------------------------
  // ATS-01: GET /health Liveness & Persistence Telemetry
  // ---------------------------------------------------------------------------
  it('ATS-01: GET /health returns 200 OK, ISO timestamp, and mongoTier/neo4jMode telemetry', async () => {
    const res = await ctx.request.get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.timestamp).toBeDefined();
    expect(new Date(res.body.timestamp).toISOString()).toBeDefined();

    expect(res.body.persistence).toBeDefined();
    expect(res.body.persistence.mongoTier).toBeDefined();
    expect(res.body.persistence.neo4jMode).toBeDefined();
    expect(typeof res.body.persistence.isMongoConnected).toBe('boolean');
    expect(typeof res.body.persistence.isNeo4jConnected).toBe('boolean');
  });

  // ---------------------------------------------------------------------------
  // ATS-02: POST /api/auth/sync Auth Enforcement
  // ---------------------------------------------------------------------------
  it('ATS-02: POST /api/auth/sync returns 401 unauthenticated, 200 with synced user profile when authenticated', async () => {
    // Negative path: missing token
    const unauthRes = await ctx.request.post('/api/auth/sync');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.success).toBe(false);

    // Happy path: valid citizen token
    const authRes = await ctx.request
      .post('/api/auth/sync')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));

    expect(authRes.status).toBe(200);
    expect(authRes.body.success).toBe(true);
    expect(authRes.body.data).toBeDefined();
    expect(authRes.body.data.role).toBe('citizen');
    expect(authRes.body.data.uid).toBe('citizen-a-uid');
    expect(authRes.body.data.email).toBe('citizen-a@aicity.gov');
  });

  // ---------------------------------------------------------------------------
  // ATS-03: POST /api/incidents Valid Creation
  // ---------------------------------------------------------------------------
  it('ATS-03: POST /api/incidents returns 201 Created with valid payload and whitelisted Cloudinary image URL', async () => {
    const payload = {
      title: 'Large Dangerous Pothole on Road',
      description: 'Deep road cavity causing severe traffic disruption in Banjara Hills near signal.',
      imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/road_cavity.jpg',
      location: { lat: 17.3850, lng: 78.4867 }
    };

    const res = await ctx.request
      .post('/api/incidents')
      .set(ctx.authHeader(TOKENS.CITIZEN_A))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.duplicateFound).toBe(false);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.incidentId).toBeDefined();
    expect(res.body.data.title).toBe(payload.title);
    expect(res.body.data.category).toBe('Infrastructure');
    expect(res.body.data.department).toBe('PWD');
    expect(res.body.data.status).toBeDefined();
    expect(res.body.data.department).toBe('PWD');
  });

  // ---------------------------------------------------------------------------
  // ATS-04: POST /api/incidents Malformed Payload Rejection (Zod)
  // ---------------------------------------------------------------------------
  it('ATS-04: POST /api/incidents rejects malformed payloads with 400 Bad Request and structured Zod errors', async () => {
    // 1. Description too short (< 10 chars)
    const shortDescRes = await ctx.request
      .post('/api/incidents')
      .set(ctx.authHeader(TOKENS.CITIZEN_A))
      .send({
        title: 'Valid Long Title Here',
        description: 'short',
        imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/pothole.jpg',
        location: { lat: 17.3850, lng: 78.4867 }
      });
    expect(shortDescRes.status).toBe(400);
    expect(shortDescRes.body.success).toBe(false);

    // 2. Latitude out of range (> 90)
    const badGeoRes = await ctx.request
      .post('/api/incidents')
      .set(ctx.authHeader(TOKENS.CITIZEN_A))
      .send({
        title: 'Valid Long Title Here',
        description: 'Valid incident description with plenty of characters.',
        imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/pothole.jpg',
        location: { lat: 999.0, lng: 78.4867 }
      });
    expect(badGeoRes.status).toBe(400);
    expect(badGeoRes.body.success).toBe(false);

    // 3. Missing required title field
    const missingTitleRes = await ctx.request
      .post('/api/incidents')
      .set(ctx.authHeader(TOKENS.CITIZEN_A))
      .send({
        description: 'Valid incident description with plenty of characters.',
        imageUrl: 'https://res.cloudinary.com/aicity/image/upload/v1700000000/pothole.jpg',
        location: { lat: 17.3850, lng: 78.4867 }
      });
    expect(missingTitleRes.status).toBe(400);
    expect(missingTitleRes.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // ATS-05: GET /api/incidents Pagination & Filtering Bounds
  // ---------------------------------------------------------------------------
  it('ATS-05: GET /api/incidents safely clamps pagination limit (<= 100) and defaults invalid negative page', async () => {
    // Seed 3 incidents
    await seedIncident({ title: 'Incident Alpha One 12345' });
    await seedIncident({ title: 'Incident Beta Two 12345' });
    await seedIncident({ title: 'Incident Gamma Three 12345' });

    const res = await ctx.request
      .get('/api/incidents?all=true&limit=500&page=-2')
      .set(ctx.authHeader(TOKENS.ADMIN_1));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    // Clamped limit <= 100
    expect(res.body.data.pagination.limit).toBeLessThanOrEqual(100);
    // Page floored to at least 1
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.incidents.length).toBeGreaterThanOrEqual(3);
  });

  // ---------------------------------------------------------------------------
  // ATS-06: GET /api/incidents/:id Entity Boundary
  // ---------------------------------------------------------------------------
  it('ATS-06: GET /api/incidents/:id returns 200 for valid ID, 400 for malformed ObjectId, and 404 for missing', async () => {
    const incident = await seedIncident();
    const validId = incident._id.toString();

    // 1. Valid ID -> 200 OK
    const validRes = await ctx.request
      .get(`/api/incidents/${validId}`)
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.data._id).toBe(validId);

    // 2. Malformed ObjectId -> 400 Bad Request
    const malformedRes = await ctx.request
      .get('/api/incidents/not-an-id')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(malformedRes.status).toBe(400);
    expect(malformedRes.body.success).toBe(false);

    // 3. Valid non-existent ObjectId -> 404 Not Found
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await ctx.request
      .get(`/api/incidents/${nonExistentId}`)
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // ATS-07: Officer Workflow Actions & RBAC (accept, reject, request-info, close)
  // ---------------------------------------------------------------------------
  it('ATS-07: Officer actions enforce RBAC (citizen gets 403), validates minimum reject length, and accept updates status', async () => {
    const incident = await seedIncident({ status: 'Submitted' });
    const incidentId = incident._id.toString();

    // 1. Citizen cannot accept -> 403 Forbidden
    const citizenRes = await ctx.request
      .post(`/api/officer/incidents/${incidentId}/accept`)
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(citizenRes.status).toBe(403);

    // 2. Officer sending short reject reason (< 10 chars) -> 400 Bad Request
    const shortRejectRes = await ctx.request
      .post(`/api/officer/incidents/${incidentId}/reject`)
      .set(ctx.authHeader(TOKENS.OFFICER_1))
      .send({ reason: 'short' });
    expect(shortRejectRes.status).toBe(400);

    // 3. Officer accept -> 200 OK & status transitions to Assigned
    const acceptRes = await ctx.request
      .post(`/api/officer/incidents/${incidentId}/accept`)
      .set(ctx.authHeader(TOKENS.OFFICER_1));
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.status).toBe('Assigned');

    // Verify in database
    const dbIncident = await Incident.findById(incidentId);
    expect(dbIncident?.status).toBe('Assigned');

    // 4. Officer close with singular resolutionNote -> 200 OK & status transitions to Resolved
    const closeSingleRes = await ctx.request
      .post(`/api/officer/incidents/${incidentId}/close`)
      .set(ctx.authHeader(TOKENS.OFFICER_1))
      .send({ resolutionNote: 'Pothole filled and compacted with cold asphalt' });
    expect(closeSingleRes.status).toBe(200);
    expect(closeSingleRes.body.success).toBe(true);
    expect(closeSingleRes.body.data.status).toBe('Resolved');

    // 5. Officer close with plural resolutionNotes -> 200 OK
    const closePluralRes = await ctx.request
      .post(`/api/officer/incidents/${incidentId}/close`)
      .set(ctx.authHeader(TOKENS.OFFICER_1))
      .send({ resolutionNotes: 'Pothole filled and compacted with cold asphalt' });
    expect(closePluralRes.status).toBe(200);
    expect(closePluralRes.body.success).toBe(true);
    expect(closePluralRes.body.data.status).toBe('Resolved');
  });

  // ---------------------------------------------------------------------------
  // ATS-08: PATCH /api/officer/incidents/:id/status (DEF-UI-01 Contract Lock)
  // ---------------------------------------------------------------------------
  it('ATS-08: PATCH /api/officer/incidents/:id/status accepts valid status (In_Progress) and rejects invalid status', async () => {
    const incident = await seedIncident({ status: 'Assigned' });
    const incidentId = incident._id.toString();

    // 1. Happy path: PATCH with In_Progress
    const patchRes = await ctx.request
      .patch(`/api/officer/incidents/${incidentId}/status`)
      .set(ctx.authHeader(TOKENS.OFFICER_1))
      .send({ status: 'In_Progress', note: 'Field inspection crew dispatched' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.status).toBe('In_Progress');

    // Verify in database
    const dbIncident = await Incident.findById(incidentId);
    expect(dbIncident?.status).toBe('In_Progress');

    // 2. Invalid status string -> 400 Bad Request
    const badStatusRes = await ctx.request
      .patch(`/api/officer/incidents/${incidentId}/status`)
      .set(ctx.authHeader(TOKENS.OFFICER_1))
      .send({ status: 'NonExistentStatus' });
    expect(badStatusRes.status).toBe(400);
    expect(badStatusRes.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // ATS-09: PATCH /api/incidents/:id/status (DEF-BE-01 Canonical Enum Lock)
  // ---------------------------------------------------------------------------
  it('ATS-09: PATCH /api/incidents/:id/status as Admin succeeds with Assigned, strictly rejects legacy AI_Assigned', async () => {
    const incident = await seedIncident({ status: 'Submitted' });
    const incidentId = incident._id.toString();

    // 1. Valid canonical status -> 200 OK
    const validRes = await ctx.request
      .patch(`/api/incidents/${incidentId}/status`)
      .set(ctx.authHeader(TOKENS.ADMIN_1))
      .send({ status: 'Assigned', note: 'Admin manual assignment' });
    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.data.status).toBe('Assigned');

    // 2. Legacy/ad-hoc status (AI_Assigned) -> 400 Bad Request
    const legacyRes = await ctx.request
      .patch(`/api/incidents/${incidentId}/status`)
      .set(ctx.authHeader(TOKENS.ADMIN_1))
      .send({ status: 'AI_Assigned' });
    expect(legacyRes.status).toBe(400);
    expect(legacyRes.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // ATS-10: PATCH /api/incidents/:id/override (DEF-BE-02 Audit Trail Lock)
  // ---------------------------------------------------------------------------
  it('ATS-10: PATCH /api/incidents/:id/override appends [ADMIN OVERRIDE] record in statusHistory with audit metadata', async () => {
    const incident = await seedIncident({ severity: 'Low', department: 'PWD' });
    const incidentId = incident._id.toString();

    const overridePayload = {
      severity: 'Critical',
      department: 'ELECTRICITY',
      reason: 'Live electrical spark reported near primary school ground'
    };

    const res = await ctx.request
      .patch(`/api/incidents/${incidentId}/override`)
      .set(ctx.authHeader(TOKENS.ADMIN_1))
      .send(overridePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify DB audit record in statusHistory
    const updated = await Incident.findById(incidentId);
    expect(updated?.severity).toBe('Critical');
    expect(updated?.department).toBe('ELECTRICITY');
    expect(updated?.statusHistory).toBeDefined();

    const lastAudit = updated?.statusHistory[updated.statusHistory.length - 1];
    expect(lastAudit?.note).toContain('[ADMIN OVERRIDE]');
    expect(lastAudit?.note).toContain('Live electrical spark');
    expect(lastAudit?.changedBy).toBeDefined();
    expect(lastAudit?.timestamp).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // ATS-11: GET /api/incidents/:id/audit & /audit/pdf
  // ---------------------------------------------------------------------------
  it('ATS-11: Audit logs & PDF export return 200 for admin with %PDF- buffer, 403 for citizen', async () => {
    const incident = await seedIncident();
    const incidentId = incident._id.toString();

    // 1. Citizen blocked from /audit and /audit/pdf -> 403 Forbidden
    const citAuditRes = await ctx.request
      .get(`/api/incidents/${incidentId}/audit`)
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(citAuditRes.status).toBe(403);

    const citPdfRes = await ctx.request
      .get(`/api/incidents/${incidentId}/audit/pdf`)
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(citPdfRes.status).toBe(403);

    // 2. Admin gets 200 on /audit with xaiPayload
    const adminAuditRes = await ctx.request
      .get(`/api/incidents/${incidentId}/audit`)
      .set(ctx.authHeader(TOKENS.ADMIN_1));
    expect(adminAuditRes.status).toBe(200);
    expect(adminAuditRes.body.success).toBe(true);
    expect(adminAuditRes.body.data.xaiPayload).toBeDefined();

    // 3. Admin gets 200 on /audit/pdf with application/pdf and non-empty %PDF- buffer
    const adminPdfRes = await ctx.request
      .get(`/api/incidents/${incidentId}/audit/pdf`)
      .set(ctx.authHeader(TOKENS.ADMIN_1));
    expect(adminPdfRes.status).toBe(200);
    expect(adminPdfRes.headers['content-type']).toContain('application/pdf');
    // Binary PDF verification
    const pdfBuffer = Buffer.from(adminPdfRes.body);
    expect(pdfBuffer.length).toBeGreaterThan(100);
    expect(pdfBuffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  // ---------------------------------------------------------------------------
  // ATS-12: Analytics & Feedback RBAC
  // ---------------------------------------------------------------------------
  it('ATS-12: Citizen is blocked (403) from analytics and feedback; officer can post feedback; admin can view health & stats', async () => {
    const incident = await seedIncident();
    const incidentId = incident._id.toString();

    // 1. Citizen blocked (403)
    const citHealth = await ctx.request
      .get('/api/analytics/health')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(citHealth.status).toBe(403);

    const citFeedback = await ctx.request
      .post('/api/feedback')
      .set(ctx.authHeader(TOKENS.CITIZEN_A))
      .send({
        incidentId,
        aiSeverity: 'High',
        officerSeverity: 'Medium',
        reason: 'Visual damage is minor on inspection'
      });
    expect(citFeedback.status).toBe(403);

    const citStats = await ctx.request
      .get('/api/feedback/stats')
      .set(ctx.authHeader(TOKENS.CITIZEN_A));
    expect(citStats.status).toBe(403);

    // 2. Officer can submit feedback -> 201 Created
    const officerFeedback = await ctx.request
      .post('/api/feedback')
      .set(ctx.authHeader(TOKENS.OFFICER_1))
      .send({
        incidentId,
        aiSeverity: 'High',
        officerSeverity: 'Medium',
        aiDepartment: 'WATER_BOARD',
        officerDepartment: 'WATER_BOARD',
        reason: 'Visual surface leakage resolved with valve turn'
      });
    expect(officerFeedback.status).toBe(201);
    expect(officerFeedback.body.success).toBe(true);

    // 3. Admin can view health analytics -> 200 OK
    const adminHealth = await ctx.request
      .get('/api/analytics/health')
      .set(ctx.authHeader(TOKENS.ADMIN_1));
    expect(adminHealth.status).toBe(200);
    expect(adminHealth.body.data.globalHealthIndex).toBeDefined();

    // 4. Admin can view feedback stats -> 200 OK
    const adminStats = await ctx.request
      .get('/api/feedback/stats')
      .set(ctx.authHeader(TOKENS.ADMIN_1));
    expect(adminStats.status).toBe(200);
    expect(adminStats.body.data.totalFeedback).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // ATS-13: OpenAPI 3.0 Interactive Documentation (GET /api/docs.json & /api/docs/)
  // ---------------------------------------------------------------------------
  it('ATS-13: GET /api/docs.json returns 200 with OpenAPI specification, and GET /api/docs/ returns 200 with HTML UI', async () => {
    // 1. Raw OpenAPI spec JSON verification
    const specRes = await ctx.request.get('/api/docs.json');
    expect(specRes.status).toBe(200);
    expect(specRes.headers['content-type']).toContain('application/json');
    expect(specRes.body).toBeDefined();
    expect(specRes.body.openapi).toBe('3.0.3');
    expect(specRes.body.paths).toBeDefined();
    expect(specRes.body.paths['/incidents']).toBeDefined();
    expect(specRes.body.paths['/officer/incidents/{id}/status']).toBeDefined();

    // 2. Swagger UI HTML page verification
    const uiRes = await ctx.request.get('/api/docs/');
    expect(uiRes.status).toBe(200);
    expect(uiRes.headers['content-type']).toContain('text/html');
    expect(uiRes.text).toContain('swagger-ui');
  });
});
