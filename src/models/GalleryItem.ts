import { Schema, model } from "mongoose";

const galleryItemSchema = new Schema({
  storefrontId: { type: Schema.Types.ObjectId, ref: "Storefront", required: true, index: true },
  tenantId: String,
  dealerId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, default: "general", index: true },
  secureUrl: { type: String, required: true },
  publicId: String,
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export default model("GalleryItem", galleryItemSchema);
