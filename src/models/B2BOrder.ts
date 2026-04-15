import { Schema, model } from "mongoose";
const schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  dealerId: { type: String, required: true, index: true },
  orderNo: { type: String, required: true, unique: true, index: true },
  category: String,
  status: { type: String, default: "Draft", index: true },
  lines: [{ sku: String, qty: Number, pricePaise: Number, receivedQty: { type: Number, default: 0 } }],
  notes: String,
  receiveHistory: [{ receivedAt: Date, lines: [{ sku: String, qty: Number }], byUserId: String }]
}, { timestamps: true });
export default model("B2BOrder", schema);
