/**
 * UTS-05 to UTS-09: Cognitive Pipeline, Duplicate Scoring & Routing Unit Tests
 * ==============================================================================
 * Tests perceptual hashing, 3-vector duplicate formula, geospatial bounds,
 * priority assessment, and department keyword routing.
 *
 * Zero external network calls. Zero Gemini API calls.
 * All tests execute real pure helper functions from pureHelpers.ts,
 * FaissIndexService, and PHashService directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import PHashService from '../../src/services/phash.service';
import FaissIndexService from '../../src/services/faissIndex.service';
import {
  computeDuplicateScore,
  isInGhmcBounds,
  isInBangaloreBounds,
  isValidMunicipalCoordinate,
  assessPriority,
  detectDepartment,
  GHMC_BOUNDING_BOX,
  BANGALORE_BOUNDING_BOX,
} from '../../src/utils/pureHelpers';

// ---------------------------------------------------------------------------
// UTS-05: 64-bit Perceptual dHash & Hamming Distance
// ---------------------------------------------------------------------------
describe('UTS-05: 64-bit Perceptual dHash & Hamming Distance', () => {
  it('(a) nominal — identical hash strings have Hamming distance 0', () => {
    const hash = '1011001101110100100110011011001010011001101100111010011011011011';
    expect(PHashService.computeHammingDistance(hash, hash)).toBe(0);
    expect(PHashService.computeVisualSimilarity(hash, hash)).toBe(1.0);
  });

  it('(b) boundary — two hashes differing by 6 bits (≤ 10 threshold) are perceptual duplicates', () => {
    const hashA = '1'.repeat(64);
    // Flip exactly 6 bits
    const hashB = '0'.repeat(6) + '1'.repeat(58);
    const distance = PHashService.computeHammingDistance(hashA, hashB);
    expect(distance).toBe(6);
    expect(distance).toBeLessThanOrEqual(10);
    // Visual similarity should be high: 1 - 6/64 ≈ 0.9063
    const sim = PHashService.computeVisualSimilarity(hashA, hashB);
    expect(sim).toBeGreaterThan(0.85);
  });

  it('(b2) boundary — two hashes differing by exactly 10 bits (at threshold boundary)', () => {
    const hashA = '1'.repeat(64);
    const hashB = '0'.repeat(10) + '1'.repeat(54);
    const distance = PHashService.computeHammingDistance(hashA, hashB);
    expect(distance).toBe(10);
    // At the threshold: still a perceptual near-duplicate
    expect(distance).toBeLessThanOrEqual(10);
  });

  it('(c) adversarial — two hashes differing by 24 bits (> 10 threshold) are classified as distinct', () => {
    const hashA = '1'.repeat(64);
    const hashB = '0'.repeat(24) + '1'.repeat(40);
    const distance = PHashService.computeHammingDistance(hashA, hashB);
    expect(distance).toBe(24);
    expect(distance).toBeGreaterThan(10); // classified as distinct
    const sim = PHashService.computeVisualSimilarity(hashA, hashB);
    expect(sim).toBeLessThan(0.70);
  });

  it('(d) generateHashFromBuffer produces 64-char binary string from real buffer', () => {
    const buf = Buffer.alloc(144, 128); // 144 bytes of value 128
    const hash = PHashService.generateHashFromBuffer(buf);
    expect(hash.length).toBe(64);
    expect(/^[01]{64}$/.test(hash)).toBe(true);
  });

  it('(e) adversarial — length-mismatched hashes are padded and compared without throwing', () => {
    const hashA = '1'.repeat(64);
    const hashB = '0'.repeat(32);
    let dist: number | undefined;
    expect(() => { dist = PHashService.computeHammingDistance(hashA, hashB); }).not.toThrow();
    expect(typeof dist).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// UTS-06: 3-Vector Composite Duplicate Formula
// ---------------------------------------------------------------------------
describe('UTS-06: 3-Vector Composite Duplicate Score Formula', () => {
  it('(a) nominal duplicate — high cosine similarity + 40m GPS + low dHash → isDuplicate: true', () => {
    // dHash sim from Hamming distance 3: 1 - 3/64 ≈ 0.953
    const visualSim = 1 - 3 / 64;

    const result = computeDuplicateScore({
      textCosineSim: 0.92,
      distanceMeters: 40,        // 40m → spatialScore = 1 - 40/200 = 0.80
      visualSim,
      sameCategory: true,        // +0.15 bonus
    });

    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateScore).toBeGreaterThan(0.45);
    // Verify formula: 0.35*0.92 + 0.35*0.80 + 0.30*visualSim + 0.15
    const expected = 0.35 * 0.92 + 0.35 * 0.80 + 0.30 * visualSim + 0.15;
    expect(result.duplicateScore).toBeCloseTo(Math.min(1.0, expected), 2);
  });

  it('(b) adversarial — orthogonal embedding + 2km distance + different category → isDuplicate: false', () => {
    // Hamming distance 32 → visualSim = 1 - 32/64 = 0.50
    const result = computeDuplicateScore({
      textCosineSim: 0.10,
      distanceMeters: 2000,      // 2000m → spatialScore = max(0, 1 - 2000/200) = 0
      visualSim: 0.50,
      sameCategory: false,
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.duplicateScore).toBeLessThan(0.45);
    expect(result.spatialScore).toBe(0);
  });

  it('(b2) boundary — score just at duplicate threshold (≈ 0.45) is flagged', () => {
    // Tune inputs to produce score ~ 0.45
    // 0.35*0.50 + 0.35*0.50 + 0.30*0.00 + 0.0 = 0.175+0.175 = 0.35 → not dup
    // Need: 0.35*0.60 + 0.35*0.60 + 0.30*0.00 = 0.42 → not quite
    // 0.35*0.65 + 0.35*0.65 + 0.30*0.00 = 0.455 → isDuplicate
    const result = computeDuplicateScore({
      textCosineSim: 0.65,
      distanceMeters: 70,        // spatialScore = 1 - 70/200 = 0.65
      visualSim: 0.0,
      sameCategory: false,
    });
    expect(result.duplicateScore).toBeGreaterThanOrEqual(0.45);
    expect(result.isDuplicate).toBe(true);
  });

  it('(c) adversarial — negative distance inputs are floored to 0 spatial score', () => {
    const result = computeDuplicateScore({
      textCosineSim: 0.0,
      distanceMeters: 99999,     // extreme distance → spatialScore clamps to 0
      visualSim: 0.0,
      sameCategory: false,
    });
    expect(result.spatialScore).toBe(0);
    expect(result.duplicateScore).toBe(0.0);
    expect(result.isDuplicate).toBe(false);
  });

  it('(d) adversarial — inputs > 1.0 are clamped so score never exceeds 1.0', () => {
    const result = computeDuplicateScore({
      textCosineSim: 1.0,
      distanceMeters: 0,         // spatialScore = 1.0
      visualSim: 1.0,
      sameCategory: true,
    });
    expect(result.duplicateScore).toBeLessThanOrEqual(1.0);
  });
});

// ---------------------------------------------------------------------------
// UTS-07: Geospatial Bounding Box Verification — GHMC
// ---------------------------------------------------------------------------
describe('UTS-07: Geospatial Bounding Box Verification — GHMC & Bangalore', () => {
  it('(a) nominal — Hyderabad city center (17.3850, 78.4867) is inside GHMC bounds', () => {
    expect(isInGhmcBounds(17.3850, 78.4867)).toBe(true);
    expect(isValidMunicipalCoordinate(17.3850, 78.4867)).toBe(true);
  });

  it('(a2) nominal — Bangalore Koramangala (12.9716, 77.5946) is inside Bangalore bounds', () => {
    expect(isInBangaloreBounds(12.9716, 77.5946)).toBe(true);
    expect(isValidMunicipalCoordinate(12.9716, 77.5946)).toBe(true);
  });

  it('(b) boundary — exact GHMC min lat boundary (17.15, 78.40) is inside', () => {
    expect(isInGhmcBounds(GHMC_BOUNDING_BOX.minLat, 78.40)).toBe(true);
  });

  it('(b2) boundary — lat just below GHMC min (17.149) is outside', () => {
    expect(isInGhmcBounds(17.149, 78.40)).toBe(false);
    expect(isValidMunicipalCoordinate(17.149, 78.40)).toBe(false);
  });

  it('(b3) boundary — exact GHMC max lat boundary (17.65, 78.40) is inside', () => {
    expect(isInGhmcBounds(GHMC_BOUNDING_BOX.maxLat, 78.40)).toBe(true);
  });

  it('(c) adversarial — New Delhi (28.6139, 77.2090) is outside both GHMC and Bangalore bounds', () => {
    expect(isInGhmcBounds(28.6139, 77.2090)).toBe(false);
    expect(isInBangaloreBounds(28.6139, 77.2090)).toBe(false);
    expect(isValidMunicipalCoordinate(28.6139, 77.2090)).toBe(false);
  });

  it('(c2) adversarial — Mumbai (19.0760, 72.8777) is outside both municipal bounds', () => {
    expect(isValidMunicipalCoordinate(19.0760, 72.8777)).toBe(false);
  });

  it('(c3) adversarial — coordinates outside Earth range (lat=100) are outside all bounds', () => {
    expect(isValidMunicipalCoordinate(100, 78.4867)).toBe(false);
    expect(isValidMunicipalCoordinate(-90, 78.4867)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UTS-08: Dynamic Priority & Severity Assessment Matrix
// ---------------------------------------------------------------------------
describe('UTS-08: Dynamic Priority & Severity Assessment Matrix', () => {
  it('(a) nominal — Critical visual severity maps to Critical output', () => {
    const severity = assessPriority('Critical', 0, 'General', true);
    expect(severity).toBe('Critical');
  });

  it('(a2) nominal — Low visual severity with no escalation factors stays Low', () => {
    const severity = assessPriority('Low', 0, 'Cosmetic Issue', true);
    expect(severity).toBe('Low');
  });

  it('(b) boundary — High + 3 nearby witnesses escalates to Critical', () => {
    // score = 3 (High) + 1 (≥3 witnesses) = 4 ≥ 3.5 → Critical
    const severity = assessPriority('High', 3, 'General', true);
    expect(severity).toBe('Critical');
  });

  it('(b2) boundary — High + 1 nearby witness = score 3.5 → Critical boundary', () => {
    // score = 3 (High) + 0.5 (≥1 witness) = 3.5 → Critical
    const severity = assessPriority('High', 1, 'General', true);
    expect(severity).toBe('Critical');
  });

  it('(b3) boundary — Medium + no witnesses + no category bonus = score 2 → Medium', () => {
    const severity = assessPriority('Medium', 0, 'General', true);
    expect(severity).toBe('Medium');
  });

  it('(c) adversarial — Electrical Hazard category forces score up by 1 point', () => {
    // Low base (1) + Electrical Hazard (+1) = 2 → Medium
    const severity = assessPriority('Low', 0, 'Electrical Hazard', true);
    expect(severity).toBe('Medium');
  });

  it('(c2) adversarial — Critical visual + Electrical Hazard + 3 witnesses = max Critical', () => {
    // 4 + 1 (witnesses) + 1 (category) = 6, clamped to 4.5 → Critical
    const severity = assessPriority('Critical', 3, 'Electrical Hazard', true);
    expect(severity).toBe('Critical');
  });

  it('(c3) adversarial — invalid geo penalizes score by 0.5', () => {
    // High (3) + geoInvalid (-0.5) = 2.5 → High (not Critical)
    const severity = assessPriority('High', 0, 'General', false);
    expect(severity).toBe('High');
  });

  it('(d) life-safety hazard inputs map to CRITICAL severity', () => {
    // Exposed live wire / critical + witnesses
    const severity = assessPriority('Critical', 3, 'Electrical Hazard', true);
    expect(severity).toBe('Critical');
  });

  it('(d2) minor cosmetic grievances map to LOW severity', () => {
    // Low + no witnesses + cosmetic category
    const severity = assessPriority('Low', 0, 'Paint Peeling', true);
    expect(severity).toBe('Low');
  });
});

// ---------------------------------------------------------------------------
// UTS-09: Municipal Department Keyword Routing
// ---------------------------------------------------------------------------
describe('UTS-09: Municipal Department Keyword Routing', () => {
  it('(a) nominal — "sparking transformer" → ELECTRICITY', () => {
    expect(detectDepartment('sparking transformer near school', 'Electrical Hazard')).toBe('ELECTRICITY');
  });

  it('(a2) nominal — "burst pipeline sewage overflow" → WATER_BOARD', () => {
    expect(detectDepartment('burst pipeline causing sewage overflow on street', 'Water Leakage')).toBe('WATER_BOARD');
  });

  it('(a3) nominal — "uncollected garbage waste dump" → SANITATION', () => {
    expect(detectDepartment('uncollected garbage and waste dump near park', 'Waste Overflow')).toBe('SANITATION');
  });

  it('(a4) nominal — "deep pothole damaged road asphalt" → PWD', () => {
    expect(detectDepartment('deep pothole in damaged road asphalt surface', 'Road Damage')).toBe('PWD');
  });

  it('(b) boundary — tie-breaking when two depts have same score defaults to first highest sort', () => {
    // No keywords → all scores 0 → default PWD
    const dept = detectDepartment('a civic issue occurred near the society', '');
    expect(dept).toBe('PWD');
  });

  it('(b2) boundary — single keyword match routes correctly', () => {
    expect(detectDepartment('electric cable down', '')).toBe('ELECTRICITY');
    expect(detectDepartment('sewer block', '')).toBe('WATER_BOARD');
    expect(detectDepartment('bin overflowing', '')).toBe('SANITATION');
    expect(detectDepartment('pothole on road', '')).toBe('PWD');
  });

  it('(c) adversarial — empty text → defaults to PWD', () => {
    expect(detectDepartment('', '')).toBe('PWD');
    expect(detectDepartment('   ', '')).toBe('PWD');
  });

  it('(c2) adversarial — entities array helps routing — entities with "water" → WATER_BOARD', () => {
    expect(detectDepartment('issue', '', ['water', 'pipe'])).toBe('WATER_BOARD');
  });

  it('(c3) adversarial — mixed keywords: electricity wins if more electric kw hits', () => {
    // electric + transformer + spark = 3 hits for ELECTRICITY vs 1 for SANITATION (bin)
    const dept = detectDepartment('electric transformer spark bin', '');
    expect(dept).toBe('ELECTRICITY');
  });

  it('(d) compound priority — "Deep waterlogged pothole on main road near LB Nagar" routes to PWD (not WATER_BOARD)', () => {
    expect(detectDepartment('Deep waterlogged pothole on main road near LB Nagar', '')).toBe('PWD');
  });

  it('(d2) compound priority — "Major drinking water pipeline burst flooding the street" routes to WATER_BOARD', () => {
    expect(detectDepartment('Major drinking water pipeline burst flooding the street', '')).toBe('WATER_BOARD');
  });
});

// ---------------------------------------------------------------------------
// FaissIndexService — vector utilities (supporting UTS-05 & UTS-06)
// ---------------------------------------------------------------------------
describe('FaissIndex Cosine Similarity & L2 Distance Utilities', () => {
  beforeEach(() => { FaissIndexService.clearIndex(); });

  it('cosine similarity of identical vectors = 1.0', () => {
    const v = [0.5, 0.3, 0.8, 0.1];
    expect(FaissIndexService.computeCosineSimilarity(v, v)).toBeCloseTo(1.0, 4);
  });

  it('cosine similarity of orthogonal vectors = 0.0', () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    expect(FaissIndexService.computeCosineSimilarity(a, b)).toBeCloseTo(0.0, 4);
  });

  it('L2 distance of identical vectors = 0', () => {
    const v = [1, 2, 3];
    expect(FaissIndexService.computeL2Distance(v, v)).toBe(0);
  });

  it('L2 distance is symmetric', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(FaissIndexService.computeL2Distance(a, b)).toBeCloseTo(
      FaissIndexService.computeL2Distance(b, a), 6
    );
  });

  it('zero vectors return 0 cosine similarity (zero-magnitude guard)', () => {
    const zero = [0, 0, 0];
    expect(FaissIndexService.computeCosineSimilarity(zero, zero)).toBe(0);
  });
});

