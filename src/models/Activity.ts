import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  branchId: String,
  leadId: String,
  type: String,
  status: String,
  dueAt: Date,
  notes: String,
  payload: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });
export default model("Activity", schema);
