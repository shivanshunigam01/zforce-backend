import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, required: true, index: true },
  /** Public CRM id, e.g. zforcec-001 */
  customerId: { type: String, index: true },
  tenantId: String,
  branchId: String,
  name: String,
  phone: String,
  altPhone: String,
  email: String,
  address: String,
  city: String,
  district: String,
  state: String,
  pincode: String,
  businessType: String,
  category: String,
  fleetSize: Number,
  kyc: {
    type: Schema.Types.Mixed,
    default: { status: "Verified", autoVerified: true },
  },
  createdFrom: String
}, { timestamps: true });

schema.index({ dealerId: 1, customerId: 1 }, { unique: true, sparse: true });

export default model("Customer", schema);
