import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  invoiceNo: String,
  status: { type: String, default: "draft", index: true },
  checks: Schema.Types.Mixed
}, { timestamps: true });
export default model("DeliveryChecklist", schema);
