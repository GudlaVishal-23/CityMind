import { Schema, model, Document, Types } from 'mongoose';

export interface IAIFeedback extends Document {
  incidentId: Types.ObjectId;
  officerId: Types.ObjectId;
  aiSeverity: string;
  officerSeverity: string;
  aiDepartment: string;
  officerDepartment: string;
  reason: string;
  createdAt: Date;
}

const AIFeedbackSchema = new Schema<IAIFeedback>({
  incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
  officerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  aiSeverity: { type: String, required: true },
  officerSeverity: { type: String, required: true },
  aiDepartment: { type: String, required: true },
  officerDepartment: { type: String, required: true },
  reason: { type: String, required: true, minlength: 10 },
  createdAt: { type: Date, default: Date.now }
});

import { createModelProxy } from '../config/dbFallback';

const rawAIFeedback = model<IAIFeedback>('AIFeedback', AIFeedbackSchema);
export const AIFeedback = createModelProxy('AIFeedback', rawAIFeedback);
export default AIFeedback;
