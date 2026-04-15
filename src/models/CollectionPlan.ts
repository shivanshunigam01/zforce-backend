import { Schema, model } from "mongoose";
const schema = new Schema({
  dealerId: { type: String, index: true },
  tenantId: String,
  customerId: String,
  dueDate: Date,
  amountPaise: Number,
  status: { type: String, default: "planned", index: true },
  notes: String
}, { timestamps: true });
export default model("CollectionPlan", schema);
