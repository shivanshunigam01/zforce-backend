// @ts-nocheck
import { Router } from "express";
import { authJwt } from "../middleware/authJwt";
import { validate } from "../middleware/validate";
import { panelAccountEnabledSchema, panelAccountPasswordChangeSchema } from "../validators/auth.validators";
import { createStaffSchema, updateStaffSchema } from "../validators/staff.validators";
import HoStaff from "../models/HoStaff";
import { HO_STAFF_DEMO } from "../seed/hoStaffDemo";
import { hashPassword, verifyPassword } from "../utils/auth";
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

function serializeStaff(doc: any) {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: o.employeeId,
    employeeId: o.employeeId,
    name: o.name,
    mobile: o.mobile,
    email: o.email ?? "",
    role: o.role,
    department: o.department ?? "",
    branch: o.branch ?? "",
    reportingTo: o.reportingTo ?? "-",
    status: o.status,
    portalUsername: o.portalUsername ?? "",
  };
}

async function nextHoEmployeeId(): Promise<string> {
  const rows = await HoStaff.find({ employeeId: /^EMP-\d+$/i }).select("employeeId").lean();
  let max = 0;
  for (const r of rows as { employeeId: string }[]) {
    const m = /^EMP-(\d+)$/i.exec(r.employeeId);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `EMP-${String(max + 1).padStart(3, "0")}`;
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

/** Dealer/distributor `userId` → `isActive` for Account Management enable/disable (must run before `/panel-accounts/:userId/enabled` param routes if any overlap). */
router.get("/panel-accounts/snapshot", async (req, res, next) => {
  try {
    const users = await User.find({ role: { $in: ["dealer", "distributor"] } })
      .select("userId isActive")
      .lean();
    const data: Record<string, boolean> = {};
    for (const u of users) {
      if (u.userId) data[u.userId] = Boolean(u.isActive);
    }
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.patch("/panel-accounts/:userId/enabled", validate(panelAccountEnabledSchema), async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.userId, role: { $in: ["dealer", "distributor"] } },
      { isActive: req.body.enabled },
      { new: true }
    );
    if (!user) throw new AppError(404, "NOT_FOUND", "Panel user not found");
    res.json({ data: { success: true, userId: user.userId, isActive: user.isActive } });
  } catch (e) {
    next(e);
  }
});

/** Verify current password against MongoDB, then update dealer/distributor login (panel `userId` = e.g. `dealer`). */
router.post("/panel-account/change-password", validate(panelAccountPasswordChangeSchema), async (req, res, next) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    if (currentPassword === newPassword) {
      throw new AppError(400, "SAME_PASSWORD", "New password must be different from current password");
    }
    const user = await User.findOne({
      userId,
      role: { $in: ["dealer", "distributor"] },
      isActive: true
    });
    if (!user) throw new AppError(404, "NOT_FOUND", "Panel account not found");
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new AppError(401, "INVALID_PASSWORD", "Current password is incorrect");
    user.passwordHash = await hashPassword(newPassword);
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
    await user.save();
    res.json({ data: { success: true } });
  } catch (e) {
    next(e);
  }
});

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

/** HO employee directory (User Management) — MongoDB-backed, not localStorage. */
router.get("/staff-directory", async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [rows, total] = await Promise.all([
      HoStaff.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      HoStaff.countDocuments({}),
    ]);
    res.json(paginated(page, limit, total, rows.map(serializeStaff)));
  } catch (e) {
    next(e);
  }
});

router.post("/staff-directory/seed-demo", async (req, res, next) => {
  try {
    const n = await HoStaff.countDocuments({});
    if (n > 0) {
      return res.json({ data: { inserted: 0, message: "Staff directory already has records; skipped." } });
    }
    await HoStaff.insertMany(HO_STAFF_DEMO);
    res.status(201).json({ data: { inserted: HO_STAFF_DEMO.length, message: "Demo staff seeded." } });
  } catch (e) {
    next(e);
  }
});

router.post("/staff-directory", validate(createStaffSchema), async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const employeeId = await nextHoEmployeeId();
    const portalUsername = String(body.portalUsername ?? "").trim();
    const password = String(body.password ?? "").trim();
    const doc: Record<string, unknown> = {
      employeeId,
      name: body.name,
      mobile: body.mobile,
      email: body.email ?? "",
      role: body.role,
      department: body.department ?? "",
      branch: body.branch ?? "",
      reportingTo: body.reportingTo ?? "-",
      status: body.status ?? "Active",
      portalUsername,
    };
    if (password) doc.portalPasswordHash = await hashPassword(password);
    const row = await HoStaff.create(doc);
    res.status(201).json({ data: serializeStaff(row) });
  } catch (e) {
    next(e);
  }
});

router.patch("/staff-directory/:employeeId", validate(updateStaffSchema), async (req, res, next) => {
  try {
    const employeeId = decodeURIComponent(req.params.employeeId);
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { ...body };
    delete update.password;
    delete update.portalUsername;
    if (body.portalUsername !== undefined) update.portalUsername = String(body.portalUsername ?? "").trim();
    const pwd = String(body.password ?? "").trim();
    if (pwd) update.portalPasswordHash = await hashPassword(pwd);
    const row = await HoStaff.findOneAndUpdate({ employeeId }, { $set: update }, { new: true });
    if (!row) throw new AppError(404, "NOT_FOUND", "Staff member not found");
    res.json({ data: serializeStaff(row) });
  } catch (e) {
    next(e);
  }
});

export default router;
