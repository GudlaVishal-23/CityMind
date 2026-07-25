import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  name: string;
  role: 'citizen' | 'officer' | 'admin';
  department?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, match: /.+\@.+\..+/ },
  name: { type: String, default: '' },
  role: { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen', index: true },
  department: { type: String, enum: ['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION'], default: undefined },
  createdAt: { type: Date, default: Date.now }
});

import { createModelProxy } from '../config/dbFallback';

const rawUser = model<IUser>('User', UserSchema);
export const User = createModelProxy('User', rawUser);
export default User;
