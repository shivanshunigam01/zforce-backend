import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  branchId: String,
  leadId: String,
  customerId: String,
  status: String,
  notes: String,
  visitAt: Date,
  payload: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });
export default model("Visit", schema);
