import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, required: true, index: true },
  tenantId: String,
  branchId: String,
  customerId: String,
  source: String,
  status: { type: String, default: "new", index: true },
  stage: { type: String, default: "prospect", index: true },
  dse: String,
  phone: String,
  payload: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });
export default model("CRMLead", schema);
