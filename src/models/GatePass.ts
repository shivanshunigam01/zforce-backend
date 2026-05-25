import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  gatePassNo: { type: String, unique: true, index: true },
  invoiceNo: String,
  status: { type: String, default: "issued", index: true },
  payload: Schema.Types.Mixed,
}, { timestamps: true });
export default model("GatePass", schema);
