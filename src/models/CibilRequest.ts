import { Schema, model } from "mongoose";

const cibilRequestSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  tenantId: String,
  dealerId: { type: String, required: true, index: true },
  draftId: { type: Schema.Types.ObjectId, ref: "CibilDraft", required: true, unique: true, index: true },
  name: String,
  phone: String,
  email: String,
  panEncrypted: { type: String, required: true },
  razorpayOrderId: { type: String, required: true, index: true },
  razorpayPaymentId: { type: String, required: true, unique: true, index: true },
  amountPaise: { type: Number, required: true },
  status: { type: String, default: "pending_review", index: true },
  internalNotes: String,
  paidAt: { type: Date, required: true },
  /** Surepass Experian credit report */
  surepassStatus: { type: String, index: true }, // success | failed | skipped
  surepassError: String,
  creditScore: Number,
  reportNumber: String,
  reportDate: String,
  reportTime: String,
  surepassRaw: { type: Schema.Types.Mixed },
  creditReportPdfUrl: String
}, { timestamps: true });

export default model("CibilRequest", cibilRequestSchema);
