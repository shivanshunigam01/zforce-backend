import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  partNo: { type: String, unique: true, index: true },
  description: String,
  qtyOnHand: { type: Number, default: 0 },
  payload: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
export default model("SparePartInventory", schema);
