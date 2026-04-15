import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  receiptNo: { type: String, unique: true, index: true },
  status: { type: String, default: "draft", index: true },
  lines: [{ sku: String, qty: Number }]
}, { timestamps: true });
export default model("StockReceipt", schema);
