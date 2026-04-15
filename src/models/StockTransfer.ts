import { Schema, model } from "mongoose";
const schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  transferId: { type: String, unique: true, index: true },
  dealerId: String,
  status: { type: String, default: "draft", index: true },
  lines: [{ sku: String, qty: Number }]
}, { timestamps: true });
export default model("StockTransfer", schema);
