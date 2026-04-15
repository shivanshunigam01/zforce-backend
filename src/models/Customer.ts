import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, required: true, index: true },
  tenantId: String,
  branchId: String,
  name: String,
  phone: String,
  altPhone: String,
  email: String,
  address: String,
  district: String,
  pincode: String,
  businessType: String,
  category: String,
  fleetSize: Number,
  kyc: { type: Schema.Types.Mixed, default: {} },
  createdFrom: String
}, { timestamps: true });
export default model("Customer", schema);
