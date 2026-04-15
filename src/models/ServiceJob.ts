import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  jobNo: { type: String, unique: true, index: true },
  customerId: String,
  vehicleNo: String,
  status: { type: String, default: "open", index: true },
  partsIssued: [{ partNo: String, qty: Number }]
}, { timestamps: true });
export default model("ServiceJob", schema);
