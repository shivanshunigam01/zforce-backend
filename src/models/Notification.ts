import { Schema, model } from "mongoose";
const schema = new Schema({
  userId: { type: String, required: true, index: true },
  title: String,
  message: String,
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true });
export default model("Notification", schema);
