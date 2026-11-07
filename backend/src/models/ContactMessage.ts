import mongoose, { Document, Schema } from "mongoose";

export type ContactTopic = "question" | "feedback" | "report";

export interface IContactMessage extends Document {
  name: string;
  email: string;
  topic: ContactTopic;
  link?: string;
  message: string;
  user?: mongoose.Types.ObjectId;
  emailed: boolean;
  createdAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, maxlength: 200 },
  topic: { type: String, required: true, enum: ["question", "feedback", "report"] },
  link: { type: String, maxlength: 300 },
  message: { type: String, required: true, maxlength: 5000 },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  emailed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IContactMessage>("ContactMessage", ContactMessageSchema);
