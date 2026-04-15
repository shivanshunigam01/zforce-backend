import { Schema, model } from "mongoose";

const refreshTokenSchema = new Schema({
  userId: { type: String, required: true, index: true },
  role: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
  userAgent: { type: String, default: "" },
  ipAddress: { type: String, default: "" }
}, { timestamps: true });

export default model("RefreshToken", refreshTokenSchema);
