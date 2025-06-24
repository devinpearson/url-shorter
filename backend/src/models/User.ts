import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  googleId: string;
  displayName: string;
  email: string;
}

const UserSchema = new Schema<IUser>({
  googleId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

export default mongoose.model<IUser>('User', UserSchema);
