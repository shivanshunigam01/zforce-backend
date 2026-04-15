import { Schema, model } from "mongoose";
const schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: String,
  dealerIds: [{ type: String }]
}, { timestamps: true });
export default model("Area", schema);
