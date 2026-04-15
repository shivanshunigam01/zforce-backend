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
    slug = slug || env.defaultStorefrontSlug;

    const storefront = await Storefront.findOne({ slug, isActive: true });
    if (!storefront) {
      throw new AppError(404, "STOREFRONT_NOT_FOUND", "Storefront not found", { slug });
    }

    req.storefront = storefront;
    next();
  } catch (error) {
    next(error);
  }
}
