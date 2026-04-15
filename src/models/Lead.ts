import { Schema, model } from "mongoose";

const leadSchema = new Schema({
  type: { type: String, required: true, index: true },
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  tenantId: String,
  dealerId: { type: String, required: true, index: true },
  source: { type: String, default: "website", index: true },
  status: { type: String, default: "new", index: true },
  name: String,
  phone: String,
  email: String,
  district: String,
  message: String,
  payload: { type: Schema.Types.Mixed, default: {} },
  notes: String,
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export default model("Lead", leadSchema);
