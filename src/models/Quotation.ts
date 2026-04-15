import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  branchId: String,
  quotationNo: { type: String, unique: true, index: true },
  customerId: String,
  status: { type: String, default: "draft", index: true },
  lines: [{ description: String, qty: Number, pricePaise: Number }],
  totalPaise: Number,
  revisions: [{ createdAt: Date, snapshot: Schema.Types.Mixed }],
  payload: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });
export default model("Quotation", schema);
