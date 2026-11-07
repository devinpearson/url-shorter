import mongoose, { type Document, Schema } from "mongoose";

export interface IUser extends Document {
  /** Auth0 user id (`profile.id`). Kept as `googleId` so existing users still match. */
  googleId: string;
  displayName: string;
  email?: string;
}

const UserSchema = new Schema<IUser>({
  googleId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  // Not every Auth0 connection returns an email; sparse lets many users have none.
  email: { type: String, unique: true, sparse: true },
});

export default mongoose.model<IUser>("User", UserSchema);
