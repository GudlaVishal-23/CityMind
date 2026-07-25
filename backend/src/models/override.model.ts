import { Schema, model, Document, Types } from 'mongoose';

export interface IAdminOverride extends Document {
  incidentId: Types.ObjectId;
  adminId: Types.ObjectId;
  originalField: 'severity' | 'department';
  previousValue: string;
  newValue: string;
  overrideReason: string;
  createdAt: Date;
}

const AdminOverrideSchema = new Schema<IAdminOverride>({
  incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originalField: { type: String, enum: ['severity', 'department'], required: true },
  previousValue: { type: String, required: true },
  newValue: { type: String, required: true },
  overrideReason: { type: String, required: true, minlength: 15 },
  createdAt: { type: Date, default: Date.now }
});

import { createModelProxy } from '../config/dbFallback';

const rawAdminOverride = model<IAdminOverride>('AdminOverride', AdminOverrideSchema);
export const AdminOverride = createModelProxy('AdminOverride', rawAdminOverride);
export default AdminOverride;
