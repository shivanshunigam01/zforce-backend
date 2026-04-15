import { Schema, model } from "mongoose";

const dealerApplicationSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", index: true },
  tenantId: String,
  dealerId: String,
  status: { type: String, default: "new", index: true },
  companyName: String,
  ownerName: String,
  phone: String,
  email: String,
  district: String,
  payload: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default model("DealerApplication", dealerApplicationSchema);
