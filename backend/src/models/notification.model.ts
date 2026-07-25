import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  incidentId: Types.ObjectId;
  type: 'complaint_submitted' | 'ai_verified' | 'assigned_department' | 'in_progress' | 'resolved' | 'info_requested' | 'rejected';
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  incidentId: { type: Schema.Types.ObjectId, ref: 'Incident', required: true },
  type: {
    type: String,
    enum: ['complaint_submitted', 'ai_verified', 'assigned_department', 'in_progress', 'resolved', 'info_requested', 'rejected'],
    required: true
  },
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

import { createModelProxy } from '../config/dbFallback';

const rawNotification = model<INotification>('Notification', NotificationSchema);
export const Notification = createModelProxy('Notification', rawNotification);
export default Notification;
