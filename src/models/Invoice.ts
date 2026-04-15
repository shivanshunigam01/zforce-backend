import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  invoiceNo: { type: String, unique: true, index: true },
  customerId: String,
  quotationId: String,
  amountPaise: Number,
  status: { type: String, default: "created", index: true }
}, { timestamps: true });
export default model("Invoice", schema);
