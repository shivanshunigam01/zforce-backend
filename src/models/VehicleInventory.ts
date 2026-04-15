import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  stockNo: { type: String, unique: true, index: true },
  chassisNo: String,
  model: String,
  status: { type: String, default: "available", index: true },
  linkedQuoteId: String
}, { timestamps: true });
export default model("VehicleInventory", schema);
