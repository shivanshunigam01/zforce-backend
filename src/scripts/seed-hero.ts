/**
 * Upload default Z-Force hero slides to Cloudinary and save on every storefront.
 * Run from backend/: npm run seed:hero
 */
import { connectDb } from "../db/mongoose";
import { env } from "../config/env";
import Storefront from "../models/Storefront";
import { buildDefaultHeroForDealer } from "../services/heroCms.service";

async function main() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error("Cloudinary env vars are required (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)");
  }
  await connectDb();
  const storefronts = await Storefront.find({});
  if (!storefronts.length) {
    console.log("No storefronts found. Run seed.ts first.");
    process.exit(1);
  }
  const byDealer = new Map<string, Awaited<ReturnType<typeof buildDefaultHeroForDealer>>>();
  for (const sf of storefronts) {
    const dealerId = String(sf.dealerId || "dealer-demo");
    if (!byDealer.has(dealerId)) {
      console.log(`Uploading hero images for dealer ${dealerId}…`);
      byDealer.set(dealerId, await buildDefaultHeroForDealer(dealerId));
      for (const slide of byDealer.get(dealerId)!.slides) {
        console.log(`  ${slide.id} → ${slide.imageUrl}`);
      }
    }
    const hero = byDealer.get(dealerId)!;
    sf.homeSections = { ...(sf.homeSections || {}), hero };
    await sf.save();
    console.log(`Saved hero on storefront "${sf.slug}"`);
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
