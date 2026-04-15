import { Schema, model } from "mongoose";

const storefrontSchema = new Schema({
  dealerId: { type: String, required: true, index: true },
  tenantId: { type: String, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  dealerName: { type: String, required: true },
  branding: {
    logoUrl: String,
    primaryColor: String,
    secondaryColor: String
  },
  siteSettings: {
    phone: String,
    phone2: String,
    whatsapp: String,
    email: String,
    address: String,
    addressHi: String,
    hours: String,
    hoursHi: String,
    mapEmbedUrl: String,
    socialLinks: {
      facebook: String,
      instagram: String,
      youtube: String,
      linkedin: String
    }
  },
  nav: { type: Schema.Types.Mixed, default: {} },
  footer: { type: Schema.Types.Mixed, default: {} },
  homepageLayout: { type: Schema.Types.Mixed, default: {} },
  homeSections: { type: Schema.Types.Mixed, default: {} },
  pageContent: { type: Schema.Types.Mixed, default: {} },
  floatingCta: { type: Schema.Types.Mixed, default: {} },
  i18n: { type: Schema.Types.Mixed, default: {} },
  seo: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default model("Storefront", storefrontSchema);
