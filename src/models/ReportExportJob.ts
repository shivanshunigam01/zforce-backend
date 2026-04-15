import { Schema, model } from "mongoose";
const schema = new Schema({
  ownerType: { type: String, index: true },
  ownerId: { type: String, index: true },
  reportKey: String,
  format: String,
  filters: Schema.Types.Mixed,
  status: { type: String, default: "queued", index: true },
  downloadUrl: String
}, { timestamps: true });
export default model("ReportExportJob", schema);
