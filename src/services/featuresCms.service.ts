import path from "path";
import fs from "fs";
import { cloudinary } from "./cloudinary.service";

const SECTION_COPY = {
  title: "Premium Features",
  subtitle: "Every ZForce comes loaded with features that matter",
};

/** Order matches homepage cards: FM → Fan → Armrest → Battery → Leg space → Rear folding */
const FEATURE_FILES = [
  {
    id: "feat-fm-music",
    sortOrder: 0,
    file: "feature-fm-music.png",
    iconKey: "Music",
    title: "FM Music System",
    description: "Built-in FM radio for entertainment during long rides",
  },
  {
    id: "feat-driver-fan",
    sortOrder: 1,
    file: "feature-driver-fan.png",
    iconKey: "Fan",
    title: "Driver Fan",
    description: "Integrated cooling fan for driver comfort",
  },
  {
    id: "feat-armrest",
    sortOrder: 2,
    file: "feature-armrest.png",
    iconKey: "Armchair",
    title: "Heavy Drive Arm Rest",
    description: "Ergonomic armrest for fatigue-free driving",
  },
  {
    id: "feat-lithium-battery",
    sortOrder: 3,
    file: "feature-lithium-battery.png",
    iconKey: "Battery",
    title: "Lithium Battery Option",
    description: "Upgrade to lithium for longer range and life",
  },
  {
    id: "feat-leg-space",
    sortOrder: 4,
    file: "feature-leg-space.png",
    iconKey: "Maximize",
    title: "Maximum Leg Space",
    description: "Designed for passenger comfort on long journeys",
  },
  {
    id: "feat-rear-folding",
    sortOrder: 5,
    file: "feature-rear-folding.png",
    iconKey: "Layers",
    title: "Rear Seat Folding",
    description: "Flexible seating for varied load requirements",
  },
] as const;

function featuresAssetsDir() {
  return path.resolve(__dirname, "../../../project-sanctuary/src/assets/features");
}

async function uploadFeatureAsset(dealerId: string, fileName: string, publicId: string) {
  const filePath = path.join(featuresAssetsDir(), fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Feature asset not found: ${filePath}`);
  }
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `zforce/${dealerId}/features`,
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
  });
  return result.secure_url as string;
}

/** Upload bundled premium feature images to Cloudinary and return CMS features payload. */
export async function buildDefaultFeaturesForDealer(dealerId: string) {
  const items = [];
  for (const row of FEATURE_FILES) {
    const imageUrl = await uploadFeatureAsset(dealerId, row.file, row.id);
    items.push({
      id: row.id,
      sortOrder: row.sortOrder,
      iconKey: row.iconKey,
      imageUrl,
      title: row.title,
      description: row.description,
    });
  }
  return { ...SECTION_COPY, items };
}
