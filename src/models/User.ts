import { Schema, model } from "mongoose";

const userSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  email: { type: String, index: true },
  displayName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ["super_admin", "ho_staff", "distributor", "dealer"],
    required: true,
    index: true
  },
  tenantId: { type: String, index: true },
  dealerId: { type: String, index: true },
  branchIds: [{ type: String }],
  permissions: [{ type: String }],
  refreshTokenVersion: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  loginFailures: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });

export default model("User", userSchema);
