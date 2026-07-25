// =============================================================================
// AI CITY — Extended XAI Audit Log Schema
// =============================================================================

import { Schema, model, Document, Types } from 'mongoose';

export interface IXAIAuditPayload {
  reasoning: string;
  evidence: string[];
  confidence: number;
  visualFindings: {
    hazardType: string;
    detectedSeverity: string;
    qualityIssues: string[];
    features: string[];
  };
  gpsValidation: {
    reverseGeocode: string;
    ward: string;
    zone: string;
    valid: boolean;
    lat: number;
    lng: number;
  };
  duplicateAnalysis: {
    duplicateScore: number;
    textCosineSimilarity: number;
    visualPhashSimilarity: number;
    spatialDistanceMeters: number;
    recommendation: string;
    parentIncidentId: string | null;
  };
  priorityJustification: {
    baseSeverity: string;
    duplicateEscalation: number;
    threatMultiplier: number;
    finalSeverity: string;
    rationale: string;
  };
  departmentJustification: {
    selectedDepartment: string;
    keywordScores: Record<string, number>;
    estimatedSLA: string;
    rationale: string;
  };
  nodeTrace: Array<{ node: string; latencyMs: number }>;
}

export interface IAILog extends Document {
  incidentId: Types.ObjectId;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  modelName: string;
  imageFeatures: string[];
  confidenceScore: number;
  reasoningReport: string;
  nodePath: string[];
  xaiPayload?: IXAIAuditPayload;
  executedAt: Date;
}

const AILogSchema = new Schema<IAILog>({
  incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, unique: true, index: true },
  promptTokens: { type: Number, required: true },
  completionTokens: { type: Number, required: true },
  latencyMs: { type: Number, required: true },
  modelName: { type: String, required: true },
  imageFeatures: [{ type: String }],
  confidenceScore: { type: Number, required: true, min: 0.0, max: 1.0 },
  reasoningReport: { type: String, required: true },
  nodePath: [{ type: String }],
  xaiPayload: { type: Schema.Types.Mixed },
  executedAt: { type: Date, default: Date.now }
});

import { createModelProxy } from '../config/dbFallback';

const rawAILog = model<IAILog>('AILog', AILogSchema);
export const AILog = createModelProxy('AILog', rawAILog);
export default AILog;
