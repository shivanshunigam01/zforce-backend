// @ts-nocheck
import { Router } from "express";
import { authJwt } from "../middleware/authJwt";
import { hashPassword } from "../utils/auth";
import { getPagination } from "../utils/pagination";
import { paginated, toJSON } from "../utils/api";
import { AppError } from "../utils/errors";
import Tenant from "../models/Tenant";
import User from "../models/User";
import Storefront from "../models/Storefront";
import DeviationRequest from "../models/DeviationRequest";
import InvoiceCancellation from "../models/InvoiceCancellation";
import AuditLog from "../models/AuditLog";
import Product from "../models/Product";
import StorefrontModel from "../models/Storefront";

const router = Router();
router.use(authJwt(["super_admin", "ho_staff"]));

async function list(req: any, res: any, Model: any, filter: any = {}, sort: any = { createdAt: -1 }) {
  const { page, limit, skip } = getPagination(req.query);
  const [rows, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limit),
    Model.countDocuments(filter)
  ]);
  res.json(paginated(page, limit, total, rows.map(toJSON)));
}
async function getOne(req: any, res: any, Model: any, filter: any) {
  const row = await Model.findOne(filter);
  if (!row) throw new AppError(404, "NOT_FOUND", "Resource not found");
  res.json({ data: toJSON(row) });
}
async function patchOne(req: any, res: any, Model: any, filter: any, payload: any) {
  const row = await Model.findOneAndUpdate(filter, payload, { new: true });
  if (!row) throw new AppError(404, "NOT_FOUND", "Resource not found");
  res.json({ data: toJSON(row) });
}

router.get("/tenants", async (req, res, next) => { try { await list(req, res, Tenant); } catch (e) { next(e); } });
router.post("/tenants", async (req, res, next) => { try { const row = await Tenant.create(req.body); res.status(201).json({ data: toJSON(row) }); } catch (e) { next(e); } });
router.patch("/tenants/:tenantId", async (req, res, next) => { try { await patchOne(req, res, Tenant, { tenantId: req.params.tenantId }, req.body); } catch (e) { next(e); } });
router.get("/tenants/:tenantId/status", async (req, res, next) => { try { await getOne(req, res, Tenant, { tenantId: req.params.tenantId }); } catch (e) { next(e); } });
router.patch("/tenants/:tenantId/status", async (req, res, next) => { try { await patchOne(req, res, Tenant, { tenantId: req.params.tenantId }, { status: req.body.status }); } catch (e) { next(e); } });

router.get("/panel-users", async (req, res, next) => { try { await list(req, res, User, { role: { $in: ["super_admin", "ho_staff"] } }); } catch (e) { next(e); } });
router.post("/panel-users", async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.password && !body.passwordHash) {
      body.passwordHash = await hashPassword(String(body.password));
      delete body.password;
    }
    const row = await User.create(body);
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.patch("/panel-users/:id", async (req, res, next) => { try { await patchOne(req, res, User, { _id: req.params.id }, req.body); } catch (e) { next(e); } });

router.get("/dealers", async (req, res, next) => { try { await list(req, res, Storefront, req.query.tenantId ? { tenantId: req.query.tenantId } : {}); } catch (e) { next(e); } });

router.get("/ho/deviation-requests", async (req, res, next) => { try { await list(req, res, DeviationRequest); } catch (e) { next(e); } });
router.patch("/ho/deviation-requests/:id", async (req, res, next) => { try { await patchOne(req, res, DeviationRequest, { _id: req.params.id }, req.body); } catch (e) { next(e); } });
router.get("/ho/invoice-cancellations", async (req, res, next) => { try { await list(req, res, InvoiceCancellation); } catch (e) { next(e); } });
router.patch("/ho/invoice-cancellations/:id", async (req, res, next) => { try { await patchOne(req, res, InvoiceCancellation, { _id: req.params.id }, req.body); } catch (e) { next(e); } });

router.get("/audit-logs", async (req, res, next) => { try { await list(req, res, AuditLog, req.query.actorId ? { actorId: req.query.actorId } : {}); } catch (e) { next(e); } });
router.post("/tenants/:tenantId/issue-distributor-token", async (req, res) => {
  res.json({ data: { tenantId: req.params.tenantId, note: "Support impersonation token flow should be signed in a privileged service." } });
});

router.get("/cms/default-products", async (req, res, next) => { try { await list(req, res, Product, { dealerId: "hq-default" }); } catch (e) { next(e); } });
router.put("/cms/default-products", async (req, res) => { res.json({ data: { note: "Bulk replace default products placeholder" } }); });
router.get("/cms/default-hero", async (req, res) => { res.json({ data: { hero: [] } }); });
router.put("/cms/default-hero", async (req, res) => { res.json({ data: { hero: req.body } }); });

export default router;
