import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  invoiceNo: String,
  status: { type: String, default: "delivered", index: true },
  customerAck: Schema.Types.Mixed,
  payload: Schema.Types.Mixed,
}, { timestamps: true });
export default model("DeliveryConfirmation", schema);
