import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  receiptNo: { type: String, unique: true, index: true },
  customerId: String,
  amountPaise: Number,
  mode: String,
  status: { type: String, default: "received", index: true }
}, { timestamps: true });
export default model("PaymentReceipt", schema);
