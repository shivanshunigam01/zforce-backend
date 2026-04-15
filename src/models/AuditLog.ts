import { Schema, model } from "mongoose";
const schema = new Schema({
  actorId: { type: String, index: true },
  actorRole: String,
  resource: { type: String, index: true },
  action: String,
  payload: Schema.Types.Mixed
}, { timestamps: true });
export default model("AuditLog", schema);
