import mongoose, { Document, Schema } from 'mongoose';

export interface IUrl extends Document {
  shortId: string;
  originalUrl: string;
  user: mongoose.Types.ObjectId;
  clicks: number;
  createdAt: Date;
}

const UrlSchema = new Schema<IUrl>({
  shortId: { type: String, required: true, unique: true },
  originalUrl: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUrl>('Url', UrlSchema);
