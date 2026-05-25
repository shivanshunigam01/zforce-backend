import { connectDb } from "../db/mongoose";
import { hashPassword } from "../utils/auth";
import { env } from "../config/env";
import Tenant from "../models/Tenant";
import Storefront from "../models/Storefront";
import User from "../models/User";
import { buildDefaultHeroForDealer } from "../services/heroCms.service";

async function main() {
  await connectDb();

  await Tenant.findOneAndUpdate(
    { tenantId: "tenant-demo" },
    { tenantId: "tenant-demo", name: "Demo Distributor", status: "active" },
    { upsert: true, new: true }
  );

  const storefrontShell = {
    dealerId: "dealer-demo",
    tenantId: "tenant-demo",
    isActive: true,
    siteSettings: {
      phone: "9999999999",
      whatsapp: "9999999999",
      email: "dealer@example.com",
      address: "Patna, Bihar"
    },
    nav: {
      items: [
        { path: "/", label: "Home" },
        { path: "/products", label: "Products" },
        { path: "/gallery", label: "Gallery" },
        { path: "/finance", label: "Finance" },
        { path: "/cibil", label: "CIBIL Check" },
        { path: "/about", label: "About" },
        { path: "/contact", label: "Contact" }
      ]
    },
    homeSections: {
      hero: { slides: [] },
      features: { title: "Features", items: [] },
      offers: { title: "Offers", cards: [] }
    }
  };

  for (const { slug, dealerName } of [
    { slug: "patna-auto", dealerName: "Patna Auto House" },
    { slug: "hq", dealerName: "ZForce HQ" }
  ]) {
    await Storefront.findOneAndUpdate(
      { slug },
      {
        ...storefrontShell,
        slug,
        dealerName
      },
      { upsert: true, new: true }
    );
  }

  const { syncShowcaseProductsForDealer } = await import("../services/productsCms.service");
  await syncShowcaseProductsForDealer("dealer-demo", "tenant-demo");

  const { seedMasterPresetsForDealer } = await import("../services/masterSeed.service");
  const masterSeed = await seedMasterPresetsForDealer("dealer-demo", "tenant-demo");
  console.log(
    `  Master data: ${masterSeed.created} created, ${masterSeed.updated} updated (${masterSeed.total} presets)`,
  );

  const passwordHash = await hashPassword("Password@123");

  await User.deleteOne({ userId: "admin", role: "super_admin" });
  const dealerPanelPermissions = [
    "dashboard",
    "crm",
    "inventory",
    "invoicing",
    "payments",
    "master_management",
    "cms",
    "reports",
    "dealer_management",
    "account_management",
    "user_management",
    "hr",
    "settings",
  ];
  await User.findOneAndUpdate(
    { userId: "dealer", role: "super_admin" },
    {
      userId: "dealer",
      email: "dealer@zforce.example",
      displayName: "Dealer",
      passwordHash,
      role: "super_admin",
      isActive: true,
      permissions: dealerPanelPermissions,
    },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { userId: "distributor" },
    { userId: "distributor", email: "distributor@example.com", displayName: "Distributor User", passwordHash, role: "distributor", tenantId: "tenant-demo", isActive: true },
    { upsert: true, new: true }
  );
  await User.deleteOne({ userId: "dealer", role: "dealer" });

  if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
    console.log("Uploading default hero slides to Cloudinary (dealer-demo)…");
    const hero = await buildDefaultHeroForDealer("dealer-demo");
    const heroStorefronts = await Storefront.find({ dealerId: "dealer-demo" });
    for (const sf of heroStorefronts) {
      sf.homeSections = { ...(sf.homeSections || {}), hero };
      await sf.save();
      console.log(`  Hero CMS saved on storefront "${sf.slug}" (${hero.slides.length} slides)`);
    }
    try {
      const { syncDefaultGalleryForDealer } = await import("../services/galleryCms.service");
      const gal = await syncDefaultGalleryForDealer("dealer-demo", "tenant-demo");
      console.log(`  Gallery: ${gal.ids.length} images on ${gal.storefrontCount} storefront(s)`);
    } catch (e) {
      console.warn("  Gallery seed failed:", e instanceof Error ? e.message : e);
    }
  } else {
    console.warn("Skipping hero/gallery CMS seed: set CLOUDINARY_* in backend/.env");
  }

  const { seedDeliveryDemo } = await import("../services/seedDeliveryDemo.service");
  const delivery = await seedDeliveryDemo("dealer-demo", "tenant-demo");
  console.log(
    `  Delivery demo: ${delivery.invoices} invoices, ${delivery.checklists} checklists, ${delivery.gatePasses} gate passes, ${delivery.confirmations} pending confirmations`,
  );

  console.log("Seed complete");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
