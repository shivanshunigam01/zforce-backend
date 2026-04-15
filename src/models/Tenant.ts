import { Schema, model } from "mongoose";
const schema = new Schema({
  tenantId: { type: String, required: true, unique: true, index: true },
  name: String,
  billing: Schema.Types.Mixed,
  status: { type: String, default: "active", index: true }
}, { timestamps: true });
export default model("Tenant", schema);
