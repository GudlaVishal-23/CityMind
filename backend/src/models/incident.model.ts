import { Schema, model, Document, Types } from 'mongoose';

export interface IStatusEntry {
  status: string;
  timestamp: Date;
  note: string;
  actorId?: string;
}

export interface IIncident extends Document {
  citizenId: Types.ObjectId;
  title: string;
  description: string;
  imageUrl: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  category: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  department: 'PWD' | 'ELECTRICITY' | 'WATER_BOARD' | 'SANITATION';
  status: 'Submitted' | 'Verified' | 'Assigned' | 'In_Progress' | 'Resolved';
  statusHistory: IStatusEntry[];
  assignedOfficerId: Types.ObjectId | null;
  isDuplicate: boolean;
  parentIncidentId: Types.ObjectId | null;
  witnessCount: number;
  resolvedAt: Date | null;
  resolutionNotes: string;
  createdAt: Date;
}

const StatusEntrySchema = new Schema<IStatusEntry>({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  actorId: { type: String }
}, { _id: false });

const IncidentSchema = new Schema<IIncident>({
  citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, minlength: 5, maxlength: 100 },
  description: { type: String, required: true, minlength: 10 },
  imageUrl: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  category: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true, index: true },
  department: { type: String, enum: ['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION'], required: true, index: true },
  status: { type: String, enum: ['Submitted', 'Verified', 'Assigned', 'In_Progress', 'Resolved'], default: 'Submitted', index: true },
  statusHistory: { type: [StatusEntrySchema], default: [] },
  assignedOfficerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  isDuplicate: { type: Boolean, default: false, index: true },
  parentIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident', default: null, index: true },
  witnessCount: { type: Number, default: 1, min: 1 },
  resolvedAt: { type: Date, default: null },
  resolutionNotes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Configure Geospatial 2dsphere Index
IncidentSchema.index({ location: '2dsphere' });

// Configure Compound Indexes
IncidentSchema.index({ department: 1, status: 1 });
IncidentSchema.index({ status: 1, severity: -1 });

import { createModelProxy } from '../config/dbFallback';

const rawIncident = model<IIncident>('Incident', IncidentSchema);
export const Incident = createModelProxy('Incident', rawIncident);
export default Incident;
