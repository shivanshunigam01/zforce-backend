import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  invoiceNo: String,
  status: { type: String, default: "pending", index: true },
  reason: String
}, { timestamps: true });
export default model("InvoiceCancellation", schema);
