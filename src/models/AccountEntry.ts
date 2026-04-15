import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  type: { type: String, index: true },
  referenceNo: String,
  accountName: String,
  amountPaise: Number,
  direction: { type: String, enum: ["debit", "credit"] },
  customerId: String
}, { timestamps: true });
export default model("AccountEntry", schema);
