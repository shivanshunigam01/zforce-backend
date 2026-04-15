import { Schema, model } from "mongoose";

const contactMessageSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  tenantId: String,
  dealerId: { type: String, required: true, index: true },
  status: { type: String, default: "unread", index: true },
  name: String,
  phone: String,
  email: String,
  message: String
}, { timestamps: true });

export default model("ContactMessage", contactMessageSchema);
