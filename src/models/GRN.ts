import { Schema, model } from "mongoose";
const schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  grnNo: { type: String, unique: true, index: true },
  status: { type: String, default: "draft", index: true },
  lines: [{ sku: String, qty: Number }]
}, { timestamps: true });
export default model("GRN", schema);
