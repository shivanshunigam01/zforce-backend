import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  invoiceNo: { type: String, unique: true, index: true },
  customerId: String,
  customerName: String,
  phone: String,
  quotationId: String,
  model: String,
  amountPaise: Number,
  status: { type: String, default: "created", index: true },
  payload: { type: Schema.Types.Mixed },
}, { timestamps: true });
export default model("Invoice", schema);
