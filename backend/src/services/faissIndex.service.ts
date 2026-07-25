// =============================================================================
// AI CITY — FAISS-style Flat Vector Index Service
// =============================================================================
// Implements an in-memory FAISS IndexFlatIP (Inner Product / Cosine Similarity)
// vector store. Indexes 3072-dimensional Gemini embeddings and provides top-K
// nearest-neighbor vector search.
// =============================================================================

import logger from '../utils/logger';

export interface VectorIndexEntry {
  incidentId: string;
  vector: number[];
  category: string;
  location: { lat: number; lng: number };
  pHash?: string;
  createdAt: Date;
}

export interface VectorSearchResult {
  entry: VectorIndexEntry;
  cosineSimilarity: number;
  l2Distance: number;
}

export class FaissIndexService {
  private static index: Map<string, VectorIndexEntry> = new Map();

  /**
   * Adds or updates a document vector in the FAISS index.
   */
  public static addIndexEntry(entry: VectorIndexEntry): void {
    this.index.set(entry.incidentId, entry);
    logger.debug(`[FaissIndexService] Vector indexed for incident [${entry.incidentId}]. Index size: ${this.index.size}`);
  }

  /**
   * Performs FAISS IndexFlatIP top-K vector search against all indexed incident embeddings.
   */
  public static searchNearestVectors(
    queryVector: number[],
    topK: number = 10,
    minSimilarityThreshold: number = 0.0
  ): VectorSearchResult[] {
    if (this.index.size === 0 || !queryVector || queryVector.length === 0) {
      return [];
    }

    const results: VectorSearchResult[] = [];

    for (const entry of this.index.values()) {
      if (!entry.vector || entry.vector.length !== queryVector.length) {
        // Skip mismatched vectors
        continue;
      }

      const cosineSim = this.computeCosineSimilarity(queryVector, entry.vector);
      const l2Dist = this.computeL2Distance(queryVector, entry.vector);

      if (cosineSim >= minSimilarityThreshold) {
        results.push({
          entry,
          cosineSimilarity: parseFloat(cosineSim.toFixed(4)),
          l2Distance: parseFloat(l2Dist.toFixed(4)),
        });
      }
    }

    // Sort by Cosine Similarity descending (highest similarity first)
    results.sort((a, b) => b.cosineSimilarity - a.cosineSimilarity);

    return results.slice(0, topK);
  }

  /**
   * Computes Cosine Similarity between two normalized or unnormalized vectors.
   */
  public static computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magA = Math.sqrt(normA);
    const magB = Math.sqrt(normB);

    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  /**
   * Computes Euclidean L2 Distance between two vectors.
   */
  public static computeL2Distance(vecA: number[], vecB: number[]): number {
    let sumSq = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      const diff = vecA[i] - vecB[i];
      sumSq += diff * diff;
    }
    return Math.sqrt(sumSq);
  }

  /**
   * Returns current count of indexed vectors.
   */
  public static getIndexSize(): number {
    return this.index.size;
  }

  /**
   * Clears the index (useful for testing).
   */
  public static clearIndex(): void {
    this.index.clear();
  }
}

export default FaissIndexService;
