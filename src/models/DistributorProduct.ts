import { Schema, model } from "mongoose";
const schema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: String,
  sku: { type: String, unique: true, index: true },
  categoryId: String,
  pricePaise: Number,
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });
export default model("DistributorProduct", schema);
