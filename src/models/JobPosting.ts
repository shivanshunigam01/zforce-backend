import { Schema, model } from "mongoose";

const jobPostingSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  dealerId: { type: String, required: true, index: true },
  tenantId: String,
  title: { type: String, required: true },
  location: String,
  department: String,
  description: String,
  isActive: { type: Boolean, default: true },
  payload: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default model("JobPosting", jobPostingSchema);
