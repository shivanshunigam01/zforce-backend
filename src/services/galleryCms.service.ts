import path from "path";
import fs from "fs";
import Storefront from "../models/Storefront";
import GalleryItem from "../models/GalleryItem";
import { cloudinary } from "./cloudinary.service";
import { GALLERY_PRESET_ITEMS } from "../data/galleryPresets";

function galleryAssetsDir() {
  return path.resolve(__dirname, "../../../project-sanctuary/src/assets/gallery");
}

async function uploadGalleryAsset(dealerId: string, fileName: string, publicId: string) {
  const filePath = path.join(galleryAssetsDir(), fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Gallery asset not found: ${filePath}`);
  }
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `zforce/${dealerId}/gallery`,
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    quality: "auto:best",
    fetch_format: "auto",
  });
  return result.secure_url as string;
}

/** Upload bundled gallery shots to Cloudinary and upsert GalleryItem rows for all dealer storefronts. */
export async function syncDefaultGalleryForDealer(
  dealerId: string,
  tenantId = "tenant-demo"
): Promise<{ ids: string[]; storefrontCount: number }> {
  const storefronts = await Storefront.find({ dealerId });
  const ids: string[] = [];

  for (const sf of storefronts) {
    for (const row of GALLERY_PRESET_ITEMS) {
      const secureUrl = await uploadGalleryAsset(dealerId, row.file, row.id);
      ids.push(row.id);
      await GalleryItem.findOneAndUpdate(
        { storefrontId: sf._id, publicId: row.id },
        {
          $set: {
            storefrontId: sf._id,
            dealerId,
            tenantId,
            title: row.title,
            category: row.category,
            secureUrl,
            publicId: row.id,
            sortOrder: row.sortOrder,
            isActive: true,
            deletedAt: null,
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  return { ids: [...new Set(ids)], storefrontCount: storefronts.length };
}
