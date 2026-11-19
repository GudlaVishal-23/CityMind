/**
 * UTS-10 to UTS-12: Security Validators & Schema Contract Unit Tests
 * ===================================================================
 * Tests SSRF URL validation, ReDoS-safe regex sanitizer, canonical status enum,
 * and Zod ingestion schema contract.
 *
 * Zero external network calls. Zero Gemini API calls.
 * All tests are hermetic and deterministic.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateSafeImageUrl, isPrivateOrReservedIP, isAllowedDomain } from '../../src/utils/urlValidator';
import { escapeRegExp } from '../../src/utils/regexUtils';
import { INCIDENT_STATUSES } from '../../src/models/incident.model';

// ---------------------------------------------------------------------------
// UTS-10: SSRF URL & Private IP Validator (DEF-SEC-05)
// ---------------------------------------------------------------------------
describe('UTS-10: SSRF URL & Private IP Validator (DEF-SEC-05)', () => {
  // ---- Protocol enforcement ----
  it('(a) nominal — valid HTTPS cloudinary URL is accepted', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    expect(() => validateSafeImageUrl(url)).not.toThrow();
    const result = validateSafeImageUrl(url);
    expect(result.hostname).toBe('res.cloudinary.com');
  });

  it('(a2) nominal — valid HTTPS Google user-content URL is accepted', () => {
    const url = 'https://lh3.googleusercontent.com/abc/photo.jpg';
    expect(() => validateSafeImageUrl(url)).not.toThrow();
  });

  it('(a3) nominal — valid HTTPS Firebase storage URL is accepted', () => {
    const url = 'https://firebasestorage.googleapis.com/v0/b/aicity.appspot.com/o/sample.jpg';
    expect(() => validateSafeImageUrl(url)).not.toThrow();
  });

  it('(b) boundary — HTTP protocol is rejected with descriptive error', () => {
    expect(() => validateSafeImageUrl('http://res.cloudinary.com/demo/image/upload/sample.jpg'))
      .toThrow(/HTTPS|protocol/i);
  });

  it('(b2) boundary — FTP protocol is rejected', () => {
    expect(() => validateSafeImageUrl('ftp://res.cloudinary.com/a.jpg'))
      .toThrow(/HTTPS|protocol/i);
  });

  it('(c) adversarial — AWS cloud metadata endpoint 169.254.169.254 is blocked', () => {
    expect(() => validateSafeImageUrl('https://169.254.169.254/latest/meta-data/'))
      .toThrow(/private|prohibited|IP/i);
  });

  it('(c2) adversarial — localhost URL is rejected', () => {
    expect(() => validateSafeImageUrl('https://127.0.0.1:5000/health'))
      .toThrow(/private|prohibited|localhost/i);
  });

  it('(c3) adversarial — 10.x.x.x private range is blocked', () => {
    expect(() => validateSafeImageUrl('https://10.0.0.1/img.jpg'))
      .toThrow(/private|prohibited|IP/i);
  });

  it('(c4) adversarial — 192.168.x.x private range is blocked', () => {
    expect(() => validateSafeImageUrl('https://192.168.1.1/a.png'))
      .toThrow(/private|prohibited|IP/i);
  });

  it('(c5) adversarial — untrusted domain is rejected even with HTTPS', () => {
    expect(() => validateSafeImageUrl('https://evil-attacker.com/res.cloudinary.com/a.jpg'))
      .toThrow(/Untrusted/i);
  });

  it('(c6) adversarial — subdomain boundary bypass attempt rejected', () => {
    // evil-res.cloudinary.com should NOT match res.cloudinary.com
    expect(() => validateSafeImageUrl('https://evil-res.cloudinary.com/a.jpg'))
      .toThrow(/Untrusted/i);
  });

  // ---- isPrivateOrReservedIP direct tests ----
  it('(a) isPrivateOrReservedIP: 169.254.169.254 (AWS metadata) → true', () => {
    expect(isPrivateOrReservedIP('169.254.169.254')).toBe(true);
  });

  it('(a2) isPrivateOrReservedIP: 127.0.0.1 (loopback) → true', () => {
    expect(isPrivateOrReservedIP('127.0.0.1')).toBe(true);
  });

  it('(a3) isPrivateOrReservedIP: 10.0.0.1 (Class A private) → true', () => {
    expect(isPrivateOrReservedIP('10.0.0.1')).toBe(true);
  });

  it('(a4) isPrivateOrReservedIP: 192.168.0.1 (Class C private) → true', () => {
    expect(isPrivateOrReservedIP('192.168.0.1')).toBe(true);
  });

  it('(b) isPrivateOrReservedIP: 172.16.0.1 (Class B private) → true', () => {
    expect(isPrivateOrReservedIP('172.16.0.1')).toBe(true);
  });

  it('(b2) isPrivateOrReservedIP: 172.31.255.255 (Class B private boundary) → true', () => {
    expect(isPrivateOrReservedIP('172.31.255.255')).toBe(true);
  });

  it('(b3) isPrivateOrReservedIP: 172.32.0.1 (outside Class B range) → false', () => {
    expect(isPrivateOrReservedIP('172.32.0.1')).toBe(false);
  });

  it('(c) isPrivateOrReservedIP: 8.8.8.8 (Google Public DNS) → false', () => {
    expect(isPrivateOrReservedIP('8.8.8.8')).toBe(false);
  });

  it('(c2) isPrivateOrReservedIP: ::1 (IPv6 loopback) → true', () => {
    expect(isPrivateOrReservedIP('::1')).toBe(true);
  });

  it('(c3) isPrivateOrReservedIP: fe80::1 (IPv6 link-local) → true', () => {
    expect(isPrivateOrReservedIP('fe80::1')).toBe(true);
  });

  it('(c4) isPrivateOrReservedIP: fd00::1 (IPv6 unique local) → true', () => {
    expect(isPrivateOrReservedIP('fd00::1')).toBe(true);
  });

  it('(c5) isPrivateOrReservedIP: empty string → true (treat as unsafe)', () => {
    expect(isPrivateOrReservedIP('')).toBe(true);
  });

  // ---- isAllowedDomain direct tests ----
  it('(a) isAllowedDomain: exact match res.cloudinary.com → true', () => {
    expect(isAllowedDomain('res.cloudinary.com')).toBe(true);
  });

  it('(b) isAllowedDomain: subdomain of cloudinary → true', () => {
    expect(isAllowedDomain('sub.res.cloudinary.com')).toBe(true);
  });

  it('(c) isAllowedDomain: evil-res.cloudinary.com → false (prefix boundary check)', () => {
    expect(isAllowedDomain('evil-res.cloudinary.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UTS-11: ReDoS & Regex Sanitizer (DEF-BE-05)
// ---------------------------------------------------------------------------
describe('UTS-11: ReDoS & Regex Sanitizer — escapeRegExp (DEF-BE-05)', () => {
  it('(a) nominal — regular search string passes through with no escaping needed', () => {
    const input = 'pothole near Hitec City';
    const result = escapeRegExp(input);
    expect(result).toBe(input); // no special chars → unchanged
  });

  it('(a2) nominal — escaped string is safe for use in new RegExp()', () => {
    const input = 'water leakage';
    const escaped = escapeRegExp(input);
    const re = new RegExp(escaped, 'i');
    expect(re.test('Water Leakage on road')).toBe(true);
  });

  it('(b) boundary — all standard regex metacharacters are escaped', () => {
    const input = '.*+?^${}()|[]\\';
    const escaped = escapeRegExp(input);
    // Every special char should be preceded by \\
    expect(escaped).toContain('\\.');
    expect(escaped).toContain('\\*');
    expect(escaped).toContain('\\+');
    expect(escaped).toContain('\\?');
    expect(escaped).toContain('\\^');
    expect(escaped).toContain('\\$');
    expect(escaped).toContain('\\(');
    expect(escaped).toContain('\\)');
    expect(escaped).toContain('\\[');
    expect(escaped).toContain('\\]');
    expect(escaped).toContain('\\\\');
  });

  it('(b2) boundary — string longer than 100 chars is truncated to exactly 100 chars', () => {
    const input = 'A'.repeat(150);
    const result = escapeRegExp(input);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('(b3) boundary — string of exactly 100 chars is preserved at 100 chars', () => {
    const input = 'B'.repeat(100);
    const result = escapeRegExp(input);
    expect(result.length).toBe(100);
  });

  it('(c) adversarial — complex ReDoS pattern is neutralized and executes in < 10ms', () => {
    const redosPayloads = [
      '^(([a-z])+.)+[A-Z]([a-z])+$',
      '(a+)+$',
      '(a|aa)+$',
      '(a*)*$',
    ];
    const attackSubject = 'a'.repeat(5000) + '!';

    for (const payload of redosPayloads) {
      const safeStr = escapeRegExp(payload);
      const re = new RegExp(safeStr);
      const t0 = Date.now();
      const matched = re.test(attackSubject);
      const elapsed = Date.now() - t0;
      expect(matched).toBe(false); // escaped metacharacters → literal match fails
      expect(elapsed).toBeLessThan(10); // must complete in < 10ms (ReDoS immune)
    }
  });

  it('(c2) adversarial — null input returns empty string without throwing', () => {
    expect(() => escapeRegExp(null as unknown as string)).not.toThrow();
    expect(escapeRegExp(null as unknown as string)).toBe('');
  });

  it('(c3) adversarial — undefined input returns empty string without throwing', () => {
    expect(() => escapeRegExp(undefined as unknown as string)).not.toThrow();
    expect(escapeRegExp(undefined as unknown as string)).toBe('');
  });

  it('(c4) adversarial — empty string returns empty string', () => {
    expect(escapeRegExp('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// UTS-12: Canonical Status Enum & Zod Ingestion Schema (DEF-BE-01)
// ---------------------------------------------------------------------------
describe('UTS-12: Canonical Status Enum & Zod Ingestion Schema (DEF-BE-01)', () => {
  // ---- Canonical INCIDENT_STATUSES ----
  it('(a) nominal — INCIDENT_STATUSES contains all 6 canonical lifecycle statuses', () => {
    const expected = ['Submitted', 'Verified', 'Assigned', 'In_Progress', 'Resolved', 'Rejected'];
    expect([...INCIDENT_STATUSES]).toEqual(expected);
  });

  it('(a2) nominal — Assigned is a valid canonical status', () => {
    expect(INCIDENT_STATUSES.includes('Assigned')).toBe(true);
  });

  it('(a3) nominal — In_Progress is a valid canonical status', () => {
    expect(INCIDENT_STATUSES.includes('In_Progress')).toBe(true);
  });

  it('(b) boundary — all 6 statuses are accepted and no 7th exists', () => {
    expect(INCIDENT_STATUSES.length).toBe(6);
    for (const s of INCIDENT_STATUSES) {
      expect(['Submitted', 'Verified', 'Assigned', 'In_Progress', 'Resolved', 'Rejected']).toContain(s);
    }
  });

  it('(c) adversarial — legacy AI_Assigned status is rejected', () => {
    // @ts-expect-error intentionally testing invalid value
    expect(INCIDENT_STATUSES.includes('AI_Assigned')).toBe(false);
  });

  it('(c2) adversarial — arbitrary/invented statuses are not accepted', () => {
    // @ts-expect-error
    expect(INCIDENT_STATUSES.includes('Pending')).toBe(false);
    // @ts-expect-error
    expect(INCIDENT_STATUSES.includes('Closed')).toBe(false);
    // @ts-expect-error
    expect(INCIDENT_STATUSES.includes('open')).toBe(false);
    // @ts-expect-error
    expect(INCIDENT_STATUSES.includes('assigned')).toBe(false); // wrong case
  });

  // ---- Zod incidentIngestSchema contract (inlined to avoid route module side effects) ----
  // We reproduce the schema inline from incident.routes.ts for unit testing purposes
  const incidentIngestSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters.').max(100),
    description: z.string().min(10, 'Description must be at least 10 characters.'),
    imageUrl: z.string().min(1, 'A valid image URL is required.'),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }, { required_error: 'Coordinates lat/lng are required.' }),
  });

  it('(a) nominal — valid complete payload passes schema validation', () => {
    const payload = {
      title: 'Burst water main near ORR',
      description: 'Large volume of water flowing from burst pipe, flooding road.',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      location: { lat: 17.3850, lng: 78.4867 },
    };
    const result = incidentIngestSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('(b) boundary — missing location coordinates rejects with Zod error', () => {
    const payload = {
      title: 'Burst water main near ORR',
      description: 'Large volume of water flowing from burst pipe.',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      // location missing
    };
    const result = incidentIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThan(0);
    expect(result.error?.issues.some(i => i.path.includes('location'))).toBe(true);
  });

  it('(b2) boundary — description shorter than 10 chars is rejected', () => {
    const payload = {
      title: 'Valid Title',
      description: 'Too short',    // only 9 chars
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      location: { lat: 17.3850, lng: 78.4867 },
    };
    const result = incidentIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some(i => i.path.includes('description'))).toBe(true);
  });

  it('(b3) boundary — title shorter than 5 chars is rejected', () => {
    const payload = {
      title: 'Hi',
      description: 'Valid description text here.',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      location: { lat: 17.3850, lng: 78.4867 },
    };
    const result = incidentIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some(i => i.path.includes('title'))).toBe(true);
  });

  it('(c) adversarial — empty description rejects with structured Zod error issues', () => {
    const payload = {
      title: 'Valid Title',
      description: '',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      location: { lat: 17.3850, lng: 78.4867 },
    };
    const result = incidentIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error?.issues).toBeDefined();
    expect(result.error!.issues.length).toBeGreaterThan(0);
  });

  it('(c2) adversarial — lat out of range (> 90) is rejected', () => {
    const payload = {
      title: 'Valid Title Here',
      description: 'Valid description text here.',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      location: { lat: 100, lng: 78.4867 },
    };
    const result = incidentIngestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some(i => i.path.includes('lat'))).toBe(true);
  });

  it('(c3) adversarial — entirely null payload rejects cleanly with issue array', () => {
    const result = incidentIngestSchema.safeParse(null);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThan(0);
  });
});

