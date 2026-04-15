import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  requestType: { type: String, default: "ho_deviation" },
  status: { type: String, default: "pending", index: true },
  reason: String,
  payload: Schema.Types.Mixed
}, { timestamps: true });
export default model("DeviationRequest", schema);
