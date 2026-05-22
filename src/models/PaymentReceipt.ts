import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  receiptNo: { type: String, unique: true, index: true },
  customerId: String,
  customerName: String,
  phone: String,
  quotationId: String,
  quoteNo: String,
  amountPaise: Number,
  mode: String,
  reference: String,
  receivedBy: String,
  depositedAt: Date,
  status: { type: String, default: "received", index: true },
  payload: Schema.Types.Mixed,
}, { timestamps: true });
export default model("PaymentReceipt", schema);
