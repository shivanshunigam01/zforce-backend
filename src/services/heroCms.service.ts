import path from "path";
import fs from "fs";
import { cloudinary } from "./cloudinary.service";

const HERO_COPY = {
  headline: "India's Most Advanced E-Rickshaw",
  subheadline: "Power. Comfort. Profit – All in One Ride.",
  bulletPoints: [
    "High mileage electric performance",
    "Strong body & premium design",
    "Low maintenance, high earnings",
  ],
  primaryCta: { label: "Enquiry Now", href: "#enquiry" },
  secondaryCta: { label: "Get Price Now", href: "/products" },
};

/** Shuffled carousel order (sync with `project-sanctuary/src/lib/heroSlideOrder.ts`). */
const SLIDE_FILES = [
  { id: "hero-blue", sortOrder: 0, file: "hero-slide-blue.png" },
  { id: "hero-passenger", sortOrder: 1, file: "hero-slide-passenger.png" },
  { id: "hero-black", sortOrder: 2, file: "hero-slide-black.png" },
  { id: "hero-red-scenic", sortOrder: 3, file: "hero-slide-red-scenic.png" },
  { id: "hero-school", sortOrder: 4, file: "hero-slide-school.png" },
  { id: "hero-cargo", sortOrder: 5, file: "hero-slide-cargo.png" },
] as const;

function heroAssetsDir() {
  return path.resolve(__dirname, "../../../project-sanctuary/src/assets/hero");
}

async function uploadHeroAsset(dealerId: string, fileName: string, publicId: string) {
  const filePath = path.join(heroAssetsDir(), fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Hero asset not found: ${filePath}`);
  }
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `zforce/${dealerId}/hero`,
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    quality: "auto:best",
    fetch_format: "auto",
  });
  return result.secure_url as string;
}

/** Upload bundled Z-Force hero images to Cloudinary and return CMS hero payload. */
export async function buildDefaultHeroForDealer(dealerId: string) {
  const slides = [];
  for (const row of SLIDE_FILES) {
    const imageUrl = await uploadHeroAsset(dealerId, row.file, row.id);
    slides.push({
      id: row.id,
      sortOrder: row.sortOrder,
      imageUrl,
      objectPosition: "68% 58%",
      objectPositionMobile: "62% 55%",
      headline: HERO_COPY.headline,
      subheadline: HERO_COPY.subheadline,
      bulletPoints: HERO_COPY.bulletPoints,
      primaryCta: HERO_COPY.primaryCta,
      secondaryCta: HERO_COPY.secondaryCta,
    });
  }
  return { autoplaySeconds: 3, slides };
}
