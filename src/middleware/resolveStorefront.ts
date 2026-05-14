import { NextFunction, Request, Response } from "express";
import Storefront from "../models/Storefront";
import { AppError } from "../utils/errors";
import { env } from "../config/env";

export async function resolveStorefront(req: Request, _res: Response, next: NextFunction) {
  try {
    const slugFromHeader = req.header("X-Storefront-Slug");
    const slugFromQuery = typeof req.query.storefrontSlug === "string" ? req.query.storefrontSlug : undefined;
    const host = req.hostname;
    let slug = slugFromHeader || slugFromQuery;

    if (!slug && host && host !== "localhost") {
      const [subdomain] = host.split(".");
      if (subdomain && subdomain !== "www") slug = subdomain;
    }
    slug = (slug || env.defaultStorefrontSlug).trim();

    /** Try primary slug first, then common demo slugs so `patna-auto` / `hq` / env default stay in sync. */
    const trySlugs = [...new Set([slug, env.defaultStorefrontSlug, "patna-auto", "hq"].filter((s) => Boolean(s && String(s).trim())))];
    let storefront = null;
    for (const s of trySlugs) {
      storefront = await Storefront.findOne({ slug: String(s).trim(), isActive: true });
      if (storefront) break;
    }
    if (!storefront) {
      throw new AppError(404, "STOREFRONT_NOT_FOUND", "Storefront not found", { tried: trySlugs });
    }

    req.storefront = storefront;
    next();
  } catch (error) {
    next(error);
  }
}
