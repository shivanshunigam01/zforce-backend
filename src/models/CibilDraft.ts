import { Schema, model } from "mongoose";

const cibilDraftSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  tenantId: String,
  dealerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  panEncrypted: { type: String, required: true },
  consent: { type: Boolean, required: true },
  paymentStatus: { type: String, default: "created", index: true },
  razorpayOrderId: { type: String, required: true, unique: true, index: true },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  amountPaise: { type: Number, required: true },
  expiresAt: { type: Date, required: true, index: true },
  paidAt: Date
}, { timestamps: true });

export default model("CibilDraft", cibilDraftSchema);
