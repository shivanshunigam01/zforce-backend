import { Schema, model } from "mongoose";

const financeApplicationSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  tenantId: String,
  dealerId: { type: String, required: true, index: true },
  status: { type: String, default: "new", index: true },
  name: String,
  phone: String,
  district: String,
  model: String,
  income: String,
  draftId: String,
  step: Number,
  payload: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default model("FinanceApplication", financeApplicationSchema);
