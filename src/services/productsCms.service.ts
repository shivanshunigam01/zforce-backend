import Storefront from "../models/Storefront";
import Product from "../models/Product";
import { SHOWCASE_PRODUCT_SOURCES } from "../data/showcaseProducts";

/** Body for Product upsert — rich UI stored in `specs.zfUi`. */
export function buildProductMongoPayload(p: Record<string, unknown>): Record<string, unknown> {
  const rawSlug = String(p.slug || p.id || "product").trim();
  const slug = rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const safeSlug = slug || "product";

  type ImgIn = string | { secureUrl?: string; publicId?: string };
  const rawList: ImgIn[] = Array.isArray(p.images)
    ? (p.images as ImgIn[])
    : p.image
      ? [String(p.image)]
      : [];
  const images: { secureUrl: string; publicId: string; purpose: string }[] = [];
  for (const entry of rawList) {
    if (typeof entry === "string") {
      const u = entry.trim();
      if (u) images.push({ secureUrl: u, publicId: "", purpose: "gallery" });
    } else if (entry && typeof entry === "object") {
      const u = String((entry as { secureUrl?: string }).secureUrl || "").trim();
      if (u) {
        images.push({
          secureUrl: u,
          publicId: String((entry as { publicId?: string }).publicId || ""),
          purpose: "gallery",
        });
      }
    }
  }
  const imgs = images.map((i) => i.secureUrl);

  const featureImages = (Array.isArray(p.featureImages) ? p.featureImages : [])
    .map((row) => {
      const r = row as { label?: string; image?: string; title?: string; secureUrl?: string };
      const title = String(r.label ?? r.title ?? "").trim();
      const secureUrl = String(r.image ?? r.secureUrl ?? "").trim();
      if (!title && !secureUrl) return null;
      return { title, secureUrl, publicId: "" };
    })
    .filter(Boolean);

  const rawSpecs = {
    ...(typeof p.specs === "object" && p.specs !== null ? (p.specs as object) : {}),
  } as Record<string, unknown>;
  delete rawSpecs.zfUi;
  const baseSpecs = rawSpecs as Record<string, string>;
  const batteryType = String(p.batteryType ?? (baseSpecs as { batteryType?: string }).batteryType ?? "");
  const tags = Array.isArray(p.tags)
    ? (p.tags as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];

  const zfUi = {
    id: safeSlug,
    slug: safeSlug,
    name: String(p.name ?? ""),
    nameHi: String(p.nameHi ?? ""),
    description: String(p.description ?? ""),
    descriptionHi: String(p.descriptionHi ?? ""),
    color: String(p.color ?? ""),
    category: String(p.category ?? "E-Rickshaw"),
    batteryType,
    isNew: Boolean(p.isNew),
    isActive: p.isActive !== false,
    image: imgs[0] || "",
    images: imgs,
    featureImages: p.featureImages,
    specs: baseSpecs,
    vehicleData: p.vehicleData,
    warranty: p.warranty,
    usps: p.usps,
    features: p.features,
    price: String(p.price ?? "Contact for Price"),
    tags,
  };

  let pricePaise = 0;
  const priceStr = String(p.price ?? "");
  const m = /₹?\s*([\d,]+)/.exec(priceStr);
  if (m) pricePaise = Number(m[1].replace(/,/g, "")) * 100;

  return {
    slug: safeSlug,
    name: String(p.name || "Product"),
    nameHi: String(p.nameHi || p.name || "Product"),
    shortDescription: String(p.description || "").slice(0, 200),
    description: String(p.description || ""),
    descriptionHi: String(p.descriptionHi || ""),
    images,
    featureImages,
    tags,
    specs: {
      ...baseSpecs,
      batteryType: batteryType || (baseSpecs as { battery?: string }).battery,
      zfUi,
    },
    pricePaise,
    isActive: p.isActive !== false,
    category: String(p.category || "vehicle"),
    deletedAt: null,
  };
}

/** Upsert the public ZForce lineup for every storefront owned by the dealer. */
export async function syncShowcaseProductsForDealer(
  dealerId: string,
  tenantId = "tenant-demo"
): Promise<{ slugs: string[]; storefrontCount: number }> {
  const storefronts = await Storefront.find({ dealerId });
  const slugs: string[] = [];

  for (const sf of storefronts) {
    for (const src of SHOWCASE_PRODUCT_SOURCES) {
      const payload = buildProductMongoPayload(src);
      const slug = String(payload.slug);
      slugs.push(slug);
      await Product.findOneAndUpdate(
        { storefrontId: sf._id, slug },
        {
          $set: {
            ...payload,
            storefrontId: sf._id,
            dealerId,
            tenantId,
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  return { slugs: [...new Set(slugs)], storefrontCount: storefronts.length };
}
