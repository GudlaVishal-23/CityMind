/**
 * AI CITY — Pure Deterministic Helper Functions
 * =============================================================================
 * Extracted pure functions from langGraphBrain.service.ts for direct unit testing
 * without loading the full LangGraph pipeline or Gemini SDK.
 *
 * All functions are side-effect-free, synchronous, and require no external I/O.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// 1. Geographic Bounding Box Helpers
// ---------------------------------------------------------------------------

export const GHMC_BOUNDING_BOX = {
  minLat: 17.15,
  maxLat: 17.65,
  minLng: 78.15,
  maxLng: 78.65,
} as const;

export const BANGALORE_BOUNDING_BOX = {
  minLat: 12.85,
  maxLat: 13.15,
  minLng: 77.45,
  maxLng: 77.75,
} as const;

/**
 * Returns true if coordinates fall within the Greater Hyderabad Municipal
 * Corporation (GHMC) bounding box.
 */
export function isInGhmcBounds(lat: number, lng: number): boolean {
  const box = GHMC_BOUNDING_BOX;
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

/**
 * Returns true if coordinates fall within the Bangalore municipal area.
 */
export function isInBangaloreBounds(lat: number, lng: number): boolean {
  const box = BANGALORE_BOUNDING_BOX;
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

/**
 * Returns true if the coordinates are valid for GHMC or Bangalore operations.
 */
export function isValidMunicipalCoordinate(lat: number, lng: number): boolean {
  return isInGhmcBounds(lat, lng) || isInBangaloreBounds(lat, lng);
}

// ---------------------------------------------------------------------------
// 2. Image Quality / Luminance Check (extracted from _isDarkOrCoveredLensBase64)
// ---------------------------------------------------------------------------

export interface LuminanceCheckResult {
  avg: number;
  variance: number;
  isDark: boolean;
  isLowVariance: boolean;
  rejected: boolean;
}

/**
 * Checks whether a base64-encoded image string represents a dark, covered-lens,
 * or flat-colored (finger/wall) image.
 *
 * Returns `rejected = true` when:
 *   - avg luminance < 40 (too dark / covered lens)
 *   - variance < 120 (flat, solid-colour surface)
 */
export function checkLuminanceFromBase64(base64: string): LuminanceCheckResult {
  if (!base64 || base64.length < 50) {
    return { avg: 0, variance: 0, isDark: true, isLowVariance: true, rejected: true };
  }

  try {
    const buf = Buffer.from(base64, 'base64');
    let sum = 0;
    let count = 0;
    const step = Math.max(1, Math.floor(buf.length / 500));

    for (let i = 0; i < buf.length; i += step) {
      sum += buf[i];
      count++;
    }

    const avg = count > 0 ? sum / count : 0;

    let diffSqSum = 0;
    for (let i = 0; i < buf.length; i += step) {
      diffSqSum += Math.pow(buf[i] - avg, 2);
    }
    const variance = count > 0 ? diffSqSum / count : 0;

    const isDark = avg < 40;
    const isLowVariance = variance < 120;
    const rejected = isDark || isLowVariance;

    return { avg, variance, isDark, isLowVariance, rejected };
  } catch {
    return { avg: 0, variance: 0, isDark: false, isLowVariance: false, rejected: false };
  }
}

// ---------------------------------------------------------------------------
// 3. Department Routing — keyword-scoring logic (extracted from departmentRoutingNode)
// ---------------------------------------------------------------------------

export type Department = 'PWD' | 'ELECTRICITY' | 'WATER_BOARD' | 'SANITATION';

/**
 * Compound phrase priorities evaluated BEFORE single-keyword hit counts.
 * Remediates priority collisions (e.g. "waterlogged pothole" matching "water" -> WATER_BOARD).
 */
export const COMPOUND_PHRASE_ROUTES: Array<{ phrases: string[]; department: Department }> = [
  // 1. Structural Road Hazards (PWD)
  {
    department: 'PWD',
    phrases: [
      'waterlogged pothole',
      'flooded road',
      'road cave-in',
      'broken road',
      'asphalt pothole',
      'damaged pavement',
      'manhole pothole',
    ],
  },
  // 2. Electrical Hazards (ELECTRICITY)
  {
    department: 'ELECTRICITY',
    phrases: [
      'sparking wire',
      'live wire',
      'electric shock',
      'street light',
      'streetlight',
      'transformer fire',
      'exposed wire',
      'hanging wire',
    ],
  },
  // 3. Water Utilities & Pipeline Breaks (WATER_BOARD)
  {
    department: 'WATER_BOARD',
    phrases: [
      'burst pipe',
      'drinking water',
      'sewage leak',
      'water pipeline',
      'no water supply',
      'pipe burst',
      'pipeline burst',
    ],
  },
  // 4. Sanitation & Waste (SANITATION)
  {
    department: 'SANITATION',
    phrases: [
      'garbage',
      'trash',
      'waste dump',
      'overflowing bin',
      'rotting waste',
      'garbage dump',
      'waste pile',
    ],
  },
];

export const DEPT_KEYWORDS: Record<string, string[]> = {
  ELECTRICITY: ['electric', 'transformer', 'wire', 'spark', 'streetlight', 'light', 'voltage', 'power', 'grid', 'cable'],
  WATER_BOARD: ['water', 'pipe', 'leak', 'drain', 'sewer', 'flood', 'sewage', 'hydrant', 'plumbing'],
  SANITATION:  ['garbage', 'waste', 'trash', 'bin', 'rubbish', 'sanitation', 'compost', 'litter', 'dump'],
  PWD:         ['road', 'pothole', 'pavement', 'bridge', 'tree', 'obstruction', 'sinkhole', 'asphalt', 'structure'],
};

/**
 * Deterministically maps a free-text hazard/category string to the highest-scoring
 * municipal department using a compound-phrase priority layer followed by keyword hit-count scoring.
 * Returns 'PWD' as default when no keywords match.
 */
export function detectDepartment(hazardText: string, category: string = '', entities: string[] = []): Department {
  const combined = `${hazardText} ${category} ${entities.join(' ')}`.toLowerCase();

  // 1. Compound Phrase Priority Layer (evaluated BEFORE single-keyword hit counts)
  for (const group of COMPOUND_PHRASE_ROUTES) {
    if (group.phrases.some(phrase => combined.includes(phrase))) {
      return group.department;
    }
  }

  // 2. Keyword Hit-Count Scoring Fallback
  const scores: Record<string, number> = { ELECTRICITY: 0, WATER_BOARD: 0, SANITATION: 0, PWD: 0 };

  for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS)) {
    for (const kw of keywords) {
      if (combined.includes(kw)) scores[dept]++;
    }
  }

  const bestDept = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (bestDept[1] > 0) {
    return bestDept[0] as Department;
  }

  return 'PWD';
}

// ---------------------------------------------------------------------------
// 4. Priority Assessment (extracted from priorityAssessmentNode)
// ---------------------------------------------------------------------------

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

/**
 * Assesses incident severity based on visual severity classification,
 * nearby-report count, incident category, and geo-validation status.
 */
export function assessPriority(
  visualSeverity: Severity,
  nearbyCount: number,
  category: string,
  geoValid: boolean = true,
): Severity {
  const severityScores: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  let score = severityScores[visualSeverity] ?? 2;

  // Witness escalation
  if (nearbyCount >= 3) score += 1;
  else if (nearbyCount >= 1) score += 0.5;

  // Category threat multiplier
  const criticalCategories = ['Electrical Hazard', 'Gas Leak', 'Structural Collapse'];
  const highCategories = ['Water Leakage', 'Road Obstruction', 'Sinkhole'];
  if (criticalCategories.some(c => category.toLowerCase().includes(c.toLowerCase()))) score += 1;
  else if (highCategories.some(c => category.toLowerCase().includes(c.toLowerCase()))) score += 0.5;

  // Geo validity penalty
  if (!geoValid) score -= 0.5;

  score = Math.max(1, Math.min(4.5, score));

  if (score >= 3.5) return 'Critical';
  if (score >= 2.5) return 'High';
  if (score >= 1.5) return 'Medium';
  return 'Low';
}

// ---------------------------------------------------------------------------
// 5. Multi-Factor Composite Duplicate Score (extracted from DuplicateService)
// ---------------------------------------------------------------------------

export interface DuplicateScoreInput {
  textCosineSim: number;    // 0.0 – 1.0
  distanceMeters: number;   // metres between GPS pins
  visualSim: number;        // 0.0 – 1.0 (Hamming-distance based)
  sameCategory: boolean;    // bonus flag
}

export interface DuplicateScoreResult {
  duplicateScore: number;   // 0.0 – 1.0 (clamped)
  isDuplicate: boolean;     // score >= 0.45
  spatialScore: number;
}

/**
 * Computes the weighted 3-vector duplicate score used by DuplicateService:
 *   35% cosine similarity + 35% spatial proximity (decay at 200m) + 30% visual dHash + 15% category bonus
 */
export function computeDuplicateScore(input: DuplicateScoreInput): DuplicateScoreResult {
  const spatialScore = Math.max(0, 1 - input.distanceMeters / 200);
  const categoryBonus = input.sameCategory ? 0.15 : 0;

  let duplicateScore =
    0.35 * input.textCosineSim +
    0.35 * spatialScore +
    0.30 * input.visualSim +
    categoryBonus;

  duplicateScore = parseFloat(Math.min(1.0, Math.max(0.0, duplicateScore)).toFixed(4));
  const isDuplicate = duplicateScore >= 0.45;

  return { duplicateScore, isDuplicate, spatialScore };
}
