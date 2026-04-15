import { Schema, model } from "mongoose";
const schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  dealerId: { type: String, required: true, index: true },
  orderNo: { type: String, required: true, index: true },
  dispatchId: { type: String, required: true, unique: true, index: true },
  vehicleNo: String,
  driver: String,
  status: { type: String, default: "created", index: true }
}, { timestamps: true });
export default model("Dispatch", schema);
