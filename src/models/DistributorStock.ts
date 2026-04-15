import { Schema, model } from "mongoose";
const schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  sku: { type: String, required: true, index: true },
  onHand: { type: Number, default: 0 },
  reserved: { type: Number, default: 0 }
}, { timestamps: true });
schema.index({ tenantId: 1, sku: 1 }, { unique: true });
export default model("DistributorStock", schema);
