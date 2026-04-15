import { Schema, model } from "mongoose";

const productSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  tenantId: { type: String, index: true },
  dealerId: { type: String, required: true, index: true },
  category: { type: String, default: "vehicle", index: true },
  name: { type: String, required: true },
  nameHi: String,
  slug: { type: String, required: true, index: true },
  shortDescription: String,
  description: String,
  descriptionHi: String,
  images: [{ secureUrl: String, publicId: String, purpose: String }],
  featureImages: [{ secureUrl: String, publicId: String, title: String }],
  specs: { type: Schema.Types.Mixed, default: {} },
  pricePaise: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

productSchema.index({ storefrontId: 1, slug: 1 }, { unique: true });

export default model("Product", productSchema);
