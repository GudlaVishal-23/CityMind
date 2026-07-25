// =============================================================================
// AI CITY — Production-Grade Duplicate Complaint Detection Service
// =============================================================================
// Implements a multi-modal duplicate detection pipeline:
//   1. Generate Gemini Embeddings (3072-dim text-embedding vector)
//   2. Search FAISS Vector Index (Flat IP nearest-neighbor retrieval)
//   3. Compute Cosine Similarity on text embeddings
//   4. Compare GPS Coordinates (Haversine spatial distance in meters)
//   5. Compare Image Similarity using 64-bit Perceptual Hash (pHash/dHash)
//   6. Produce unified Duplicate Score, Similarity breakdown, nearby incident IDs,
//      and final recommendation ('FLAG_DUPLICATE' | 'LINK_TO_PARENT' | 'CREATE_NEW')
// =============================================================================

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import Incident, { IIncident } from '../models/incident.model';
import FaissIndexService from './faissIndex.service';
import PHashService from './phash.service';
import logger from '../utils/logger';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface DuplicateAnalysisResult {
  isDuplicate: boolean;
  duplicateScore: number; // 0.00 to 1.00
  recommendation: 'FLAG_DUPLICATE' | 'LINK_TO_PARENT' | 'CREATE_NEW';
  parentIncidentId: string | null;
  nearbyIncidentIds: string[];
  similarity: {
    textCosineSimilarity: number;
    visualPhashSimilarity: number;
    spatialDistanceMeters: number;
  };
  explanation: string;
}

export class DuplicateService {
  /**
   * Generates a 3072-dimensional Gemini text embedding for the given complaint text.
   * Falls back to term-frequency vector representation if Gemini API key is missing.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    if (ai) {
      try {
        const response = await ai.models.embedContent({
          model: 'gemini-embedding-001',
          contents: text
        });

        if (response.embeddings?.[0]?.values) {
          return response.embeddings[0].values;
        }
      } catch (err) {
        logger.warn(`[DuplicateService] Gemini embedContent failed, falling back to local vector generation: ${err}`);
      }
    }

    // Fallback: deterministic word-hash vector (256-dim)
    return this.generateFallbackVector(text);
  }

  /**
   * Main production workflow for duplicate complaint detection.
   */
  public static async analyzeDuplicate(
    complaintText: string,
    imageUrl: string,
    location: { lat: number; lng: number },
    category: string
  ): Promise<DuplicateAnalysisResult> {
    const startTime = Date.now();
    logger.info(`[DuplicateService] Starting multi-modal duplicate detection for location [${location.lat}, ${location.lng}]`);

    // Step 1: Generate Gemini Embedding
    const textEmbedding = await this.generateEmbedding(complaintText);

    // Step 2 & 5: Compute pHash for input image
    const inputPHash = await PHashService.generateHashFromUrl(imageUrl);

    // Fetch active candidates from MongoDB within 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentIncidents = await Incident.find({
      isDuplicate: false,
      status: { $ne: 'Resolved' },
      createdAt: { $gte: fortyEightHoursAgo }
    }).sort({ createdAt: -1 }).limit(100);

    // Ensure candidate incidents are indexed in FAISS
    for (const inc of recentIncidents as any[]) {
      const incLat = inc.location?.coordinates?.[1];
      const incLng = inc.location?.coordinates?.[0];
      if (incLat == null || incLng == null) continue;

      const incIdStr = inc._id.toString();
      // Generate embedding & hash for candidates if not yet indexed in FAISS
      const incText = `${inc.title} ${inc.description}`;
      const incEmbedding = await this.generateEmbedding(incText);
      const incPHash = await PHashService.generateHashFromUrl(inc.imageUrl);

      FaissIndexService.addIndexEntry({
        incidentId: incIdStr,
        vector: incEmbedding,
        category: inc.category,
        location: { lat: incLat, lng: incLng },
        pHash: incPHash,
        createdAt: inc.createdAt
      });
    }

    // Step 2 & 3: Search FAISS Index for nearest vector matches
    const faissResults = FaissIndexService.searchNearestVectors(textEmbedding, 10, 0.0);

    let bestMatchCandidate: {
      incidentId: string;
      duplicateScore: number;
      textCosineSim: number;
      visualSim: number;
      distMeters: number;
    } | null = null;

    const nearbyIncidentIds: string[] = [];

    // Step 4 & 5: Compare GPS Distance and pHash Visual Similarity across candidates
    for (const incident of recentIncidents as any[]) {
      const incIdStr = incident._id.toString();
      const incLat = incident.location?.coordinates?.[1];
      const incLng = incident.location?.coordinates?.[0];
      if (incLat == null || incLng == null) continue;

      // Compute GPS Haversine distance in meters
      const distMeters = this.haversineDistance(location.lat, location.lng, incLat, incLng);

      if (distMeters <= 500) {
        nearbyIncidentIds.push(incIdStr);
      }

      // Retrieve FAISS vector cosine similarity
      const faissMatch = faissResults.find(r => r.entry.incidentId === incIdStr);
      const textCosineSim = faissMatch ? faissMatch.cosineSimilarity : 0.5;

      // Compute pHash Visual Similarity
      const candidatePHash = faissMatch?.entry.pHash || await PHashService.generateHashFromUrl(incident.imageUrl);
      const visualSim = PHashService.computeVisualSimilarity(inputPHash, candidatePHash);

      // Compute Spatial Score (1.0 at 0m, decaying to 0.0 at 200m)
      const spatialScore = Math.max(0, 1 - distMeters / 200);

      // Category Bonus
      const categoryBonus = (incident.category === category) ? 0.15 : 0;

      // Step 6: Multi-Factor Duplicate Score Calculation
      // Weighted formula: 35% Text Cosine + 35% Spatial Proximity + 30% Visual pHash
      let duplicateScore = (0.35 * textCosineSim) + (0.35 * spatialScore) + (0.30 * visualSim) + categoryBonus;
      duplicateScore = parseFloat(Math.min(1.0, Math.max(0.0, duplicateScore)).toFixed(4));

      if (!bestMatchCandidate || duplicateScore > bestMatchCandidate.duplicateScore) {
        bestMatchCandidate = {
          incidentId: incIdStr,
          duplicateScore,
          textCosineSim,
          visualSim,
          distMeters: Math.round(distMeters)
        };
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`[DuplicateService] Multi-modal duplicate scan completed in ${duration}ms. FAISS Index Size: ${FaissIndexService.getIndexSize()}`);

    if (!bestMatchCandidate || bestMatchCandidate.duplicateScore < 0.45) {
      return {
        isDuplicate: false,
        duplicateScore: bestMatchCandidate?.duplicateScore || 0.0,
        recommendation: 'CREATE_NEW',
        parentIncidentId: null,
        nearbyIncidentIds,
        similarity: {
          textCosineSimilarity: bestMatchCandidate?.textCosineSim || 0.0,
          visualPhashSimilarity: bestMatchCandidate?.visualSim || 0.0,
          spatialDistanceMeters: bestMatchCandidate?.distMeters || 0
        },
        explanation: 'No significant spatial, visual, or semantic duplicate matches detected.'
      };
    }

    // Determine Recommendation
    let recommendation: 'FLAG_DUPLICATE' | 'LINK_TO_PARENT' | 'CREATE_NEW' = 'CREATE_NEW';
    if (bestMatchCandidate.duplicateScore > 0.90) {
      recommendation = 'FLAG_DUPLICATE';
    } else if (bestMatchCandidate.duplicateScore >= 0.65) {
      recommendation = 'LINK_TO_PARENT';
    }

    return {
      isDuplicate: true,
      duplicateScore: bestMatchCandidate.duplicateScore,
      recommendation,
      parentIncidentId: bestMatchCandidate.incidentId,
      nearbyIncidentIds,
      similarity: {
        textCosineSimilarity: bestMatchCandidate.textCosineSim,
        visualPhashSimilarity: bestMatchCandidate.visualSim,
        spatialDistanceMeters: bestMatchCandidate.distMeters
      },
      explanation: `Matched candidate incident #${bestMatchCandidate.incidentId.substring(18)} (${bestMatchCandidate.distMeters}m away) with ${(bestMatchCandidate.duplicateScore * 100).toFixed(1)}% confidence.`
    };
  }

  /**
   * Haversine distance formula in meters.
   */
  public static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Helper method for legacy callers maintaining MongoDB 2dsphere compatibility.
   */
  public static async checkDuplicate(
    location: { lat: number; lng: number },
    category: string
  ): Promise<IIncident | null> {
    try {
      const { lat, lng } = location;
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const duplicate = await Incident.findOne({
        category,
        isDuplicate: false,
        createdAt: { $gte: fortyEightHoursAgo },
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: 50
          }
        }
      });

      return duplicate;
    } catch (error) {
      logger.error(`[DuplicateService] checkDuplicate error: ${error}`);
      return null;
    }
  }

  /**
   * Local vector generator fallback when API key is missing.
   */
  private static generateFallbackVector(text: string): number[] {
    const vector = new Array(256).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash << 5) - hash + word.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % 256;
      vector[idx] += 1;
    }

    // Normalize
    const mag = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return mag ? vector.map(v => v / mag) : vector;
  }
}

export default DuplicateService;
