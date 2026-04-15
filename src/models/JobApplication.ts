import { Schema, model } from "mongoose";

const jobApplicationSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  dealerId: { type: String, required: true, index: true },
  tenantId: String,
  jobPostingId: { type: Schema.Types.ObjectId, ref: "JobPosting" },
  status: { type: String, default: "new", index: true },
  name: String,
  phone: String,
  email: String,
  resumeUrl: String,
  payload: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default model("JobApplication", jobApplicationSchema);
