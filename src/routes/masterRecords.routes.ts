// @ts-nocheck
import { Router } from "express";
import { validate } from "../middleware/validate";
import {
  createMasterSchema,
  MASTER_TYPES,
  mastersCatalogQuerySchema,
  mastersListQuerySchema,
  updateMasterSchema,
} from "../validators/masters.validators";
import MasterRecord from "../models/MasterRecord";
import StorefrontModel from "../models/Storefront";
import { getPagination } from "../utils/pagination";
import { paginated, toJSON } from "../utils/api";
import { AppError } from "../utils/errors";

export function resolveMasterDealerId(req: any): string {
  const byQuery = String(req.query.dealerId || "").trim();
  if (byQuery) return byQuery;
  const byHeader = String(req.header("x-dealer-id") || "").trim();
  if (byHeader) return byHeader;
  const byJwt = String(req.user?.dealerId || "").trim();
  if (byJwt) return byJwt;
  return "dealer-demo";
}

/** Master Management CRUD — mount on `/admin` (HO JWT) and `/dealer` (dealer panel JWT). */
export function registerMasterRecordRoutes(router: Router): void {
  /** Single request: all master types for dropdowns (replaces N per-type list calls). */
  router.get("/masters/catalog", validate(mastersCatalogQuerySchema, "query"), async (req, res, next) => {
    try {
      const dealerId = resolveMasterDealerId(req);
      const rows = await MasterRecord.find({ dealerId }).sort({ createdAt: -1 }).limit(5000).lean();
      const catalog = Object.fromEntries(MASTER_TYPES.map((t) => [t, []]));
      for (const row of rows) {
        const type = String(row.type || "");
        if (!catalog[type]) catalog[type] = [];
        catalog[type].push(toJSON(row));
      }
      res.json({ data: catalog });
    } catch (e) {
      next(e);
    }
  });

  router.get("/masters", validate(mastersListQuerySchema, "query"), async (req, res, next) => {
    try {
      const dealerId = resolveMasterDealerId(req);
      const { page, limit, skip } = getPagination(req.query);
      const filter = { dealerId, type: req.query.type };
      const [rows, total] = await Promise.all([
        MasterRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        MasterRecord.countDocuments(filter),
      ]);
      res.json(paginated(page, limit, total, rows.map(toJSON)));
    } catch (e) {
      next(e);
    }
  });

  router.post("/masters", validate(createMasterSchema), async (req, res, next) => {
    try {
      const dealerId = resolveMasterDealerId(req);
      const sf = await StorefrontModel.findOne({ dealerId }).select("tenantId");
      const row = await MasterRecord.create({
        dealerId,
        tenantId: sf?.tenantId || req.user?.tenantId || "",
        type: req.body.type,
        code: req.body.code || "",
        name: req.body.name,
        status: req.body.status || "Active",
        extra: req.body.extra || {},
      });
      res.status(201).json({ data: toJSON(row) });
    } catch (e) {
      next(e);
    }
  });

  router.post("/masters/seed-default", async (req, res, next) => {
    try {
      const dealerId = resolveMasterDealerId(req);
      const { seedMasterPresetsForDealer } = await import("../services/masterSeed.service");
      const result = await seedMasterPresetsForDealer(dealerId);
      res.json({ data: result });
    } catch (e) {
      next(e);
    }
  });

  router.patch("/masters/:id", validate(updateMasterSchema), async (req, res, next) => {
    try {
      const dealerId = resolveMasterDealerId(req);
      const row = await MasterRecord.findOneAndUpdate(
        { _id: req.params.id, dealerId },
        { $set: req.body },
        { new: true },
      );
      if (!row) throw new AppError(404, "NOT_FOUND", "Master row not found");
      res.json({ data: toJSON(row) });
    } catch (e) {
      next(e);
    }
  });

  router.delete("/masters/:id", async (req, res, next) => {
    try {
      const dealerId = resolveMasterDealerId(req);
      const row = await MasterRecord.findOneAndDelete({ _id: req.params.id, dealerId });
      if (!row) throw new AppError(404, "NOT_FOUND", "Master row not found");
      res.json({ data: { success: true } });
    } catch (e) {
      next(e);
    }
  });
}
