// @ts-nocheck
import { Router } from "express";
import { authJwt, requireDealerScope } from "../middleware/authJwt";
import { requireModulePermission } from "../middleware/panelPermissions";
import { buildSignedUploadParams } from "../services/cloudinary.service";
import { getPagination } from "../utils/pagination";
import { paginated, toJSON } from "../utils/api";
import Storefront from "../models/Storefront";
import Product from "../models/Product";
import GalleryItem from "../models/GalleryItem";
import Lead from "../models/Lead";
import FinanceApplication from "../models/FinanceApplication";
import ContactMessage from "../models/ContactMessage";
import CibilRequest from "../models/CibilRequest";
import DealerApplication from "../models/DealerApplication";
import JobApplication from "../models/JobApplication";
import JobPosting from "../models/JobPosting";
import Notification from "../models/Notification";
import Customer from "../models/Customer";
import CRMLead from "../models/CRMLead";
import Visit from "../models/Visit";
import Activity from "../models/Activity";
import Quotation from "../models/Quotation";
import B2BOrder from "../models/B2BOrder";
import PaymentReceipt from "../models/PaymentReceipt";
import DeviationRequest from "../models/DeviationRequest";
import CollectionPlan from "../models/CollectionPlan";
import Invoice from "../models/Invoice";
import InvoiceCancellation from "../models/InvoiceCancellation";
import DeliveryChecklist from "../models/DeliveryChecklist";
import GatePass from "../models/GatePass";
import DeliveryConfirmation from "../models/DeliveryConfirmation";
import VehicleInventory from "../models/VehicleInventory";
import SparePartInventory from "../models/SparePartInventory";
import BatteryInventory from "../models/BatteryInventory";
import StockReceipt from "../models/StockReceipt";
import PurchaseOrder from "../models/PurchaseOrder";
import ServiceJob from "../models/ServiceJob";
import AccountEntry from "../models/AccountEntry";
import ReportExportJob from "../models/ReportExportJob";
import { AppError } from "../utils/errors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router = Router();
router.use(authJwt(["dealer", "super_admin", "ho_staff"]), requireDealerScope);
router.use((req, res, next) => {
  const p = req.path || "";
  if (p.startsWith("/cms/")) return requireModulePermission("cms")(req, res, next);
  if (p.startsWith("/dms/reports")) return requireModulePermission("reports")(req, res, next);
  if (p.startsWith("/dms/crm/")) return requireModulePermission("crm")(req, res, next);
  if (p.startsWith("/dms/invoices") || p.startsWith("/dms/invoice-cancellations")) {
    return requireModulePermission("invoicing")(req, res, next);
  }
  if (p.startsWith("/dms/payment-receipts") || p.startsWith("/dms/outstanding") || p.startsWith("/dms/accounts/")) {
    return requireModulePermission("payments")(req, res, next);
  }
  if (
    p.startsWith("/dms/inventory/") ||
    p.startsWith("/dms/stock-receipts") ||
    p.startsWith("/dms/purchase-orders") ||
    p.startsWith("/dms/delivery/") ||
    p.startsWith("/dms/service/") ||
    p.startsWith("/dms/orders")
  ) {
    return requireModulePermission("inventory")(req, res, next);
  }
  if (p.startsWith("/dms/dashboard")) return requireModulePermission("dashboard")(req, res, next);
  return next();
});

function dealerFilter(req: any) {
  return { dealerId: req.user.dealerId };
}
async function dealerStorefront(req: any) {
  const sf = await Storefront.findOne({ dealerId: req.user.dealerId });
  if (!sf) throw new AppError(404, "STOREFRONT_NOT_FOUND", "Storefront not found for dealer");
  return sf;
}
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

const brochureUploadDir = path.join(process.cwd(), "uploads", "product-brochures");
const brochureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      fs.mkdirSync(brochureUploadDir, { recursive: true });
      cb(null, brochureUploadDir);
    } catch (e) {
      cb(e as Error, brochureUploadDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext === ".zip" ? ".zip" : ".pdf";
    cb(null, `${String(req.params.id)}-${randomUUID()}${safeExt}`);
  }
});
const brochureUpload = multer({
  storage: brochureStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed";
    if (!ok) return cb(new Error("Only PDF or ZIP files are allowed"));
    cb(null, true);
  }
});

router.post("/media/cloudinary/signature", async (req, res, next) => {
  try {
    const folder = `zforce/${req.user!.dealerId}/${req.body.folder || "general"}`;
    res.json({ data: buildSignedUploadParams(folder) });
  } catch (e) { next(e); }
});

router.get("/cms/storefront", async (req, res, next) => {
  try { res.json({ data: toJSON(await dealerStorefront(req)) }); } catch (e) { next(e); }
});
router.patch("/cms/storefront", async (req, res, next) => {
  try {
    const row = await Storefront.findOneAndUpdate({ dealerId: req.user!.dealerId }, req.body, { new: true });
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/cms/navigation", async (req, res, next) => {
  try { const sf = await dealerStorefront(req); res.json({ data: sf.nav || {} }); } catch (e) { next(e); }
});
router.put("/cms/navigation", async (req, res, next) => {
  try {
    const sf = await Storefront.findOneAndUpdate({ dealerId: req.user!.dealerId }, { nav: req.body }, { new: true });
    res.json({ data: sf?.nav || {} });
  } catch (e) { next(e); }
});
router.get("/cms/homepage", async (req, res, next) => {
  try { const sf = await dealerStorefront(req); res.json({ data: sf.homepageLayout || {} }); } catch (e) { next(e); }
});
router.put("/cms/homepage", async (req, res, next) => {
  try {
    const sf = await Storefront.findOneAndUpdate({ dealerId: req.user!.dealerId }, { homepageLayout: req.body }, { new: true });
    res.json({ data: sf?.homepageLayout || {} });
  } catch (e) { next(e); }
});

const homeSectionMap: Record<string, string> = {
  hero: "hero",
  features: "features",
  offers: "offers",
  "product-highlight": "productHighlight",
  testimonials: "testimonials",
  emi: "emi",
  "why-zforce": "whyZforce"
};

Object.entries(homeSectionMap).forEach(([pathKey, dataKey]) => {
  router.get(`/cms/home/${pathKey}`, async (req, res, next) => {
    try { const sf = await dealerStorefront(req); res.json({ data: sf.homeSections?.[dataKey] || {} }); } catch (e) { next(e); }
  });
  router.put(`/cms/home/${pathKey}`, async (req, res, next) => {
    try {
      const sf = await Storefront.findOne({ dealerId: req.user!.dealerId });
      if (!sf) throw new AppError(404, "STOREFRONT_NOT_FOUND", "Storefront missing");
      sf.homeSections = { ...(sf.homeSections || {}), [dataKey]: req.body };
      await sf.save();
      res.json({ data: sf.homeSections[dataKey] });
    } catch (e) { next(e); }
  });
});

router.get("/cms/site-settings", async (req, res, next) => {
  try { const sf = await dealerStorefront(req); res.json({ data: sf.siteSettings || {} }); } catch (e) { next(e); }
});
router.put("/cms/site-settings", async (req, res, next) => {
  try {
    const sf = await Storefront.findOneAndUpdate({ dealerId: req.user!.dealerId }, { siteSettings: req.body }, { new: true });
    res.json({ data: sf?.siteSettings || {} });
  } catch (e) { next(e); }
});
router.get("/cms/i18n", async (req, res, next) => {
  try { const sf = await dealerStorefront(req); res.json({ data: sf.i18n || {} }); } catch (e) { next(e); }
});
router.put("/cms/i18n", async (req, res, next) => {
  try {
    const sf = await Storefront.findOneAndUpdate({ dealerId: req.user!.dealerId }, { i18n: req.body }, { new: true });
    res.json({ data: sf?.i18n || {} });
  } catch (e) { next(e); }
});
router.get("/cms/footer", async (req, res, next) => {
  try { const sf = await dealerStorefront(req); res.json({ data: sf.footer || {} }); } catch (e) { next(e); }
});
router.put("/cms/footer", async (req, res, next) => {
  try {
    const sf = await Storefront.findOneAndUpdate({ dealerId: req.user!.dealerId }, { footer: req.body }, { new: true });
    res.json({ data: sf?.footer || {} });
  } catch (e) { next(e); }
});

["about","finance","cibil","contact","career","dealer-locator","become-dealer"].forEach((key) => {
  router.get(`/cms/pages/${key}`, async (req, res, next) => {
    try { const sf = await dealerStorefront(req); res.json({ data: sf.pageContent?.[key] || {} }); } catch (e) { next(e); }
  });
  router.put(`/cms/pages/${key}`, async (req, res, next) => {
    try {
      const sf = await Storefront.findOne({ dealerId: req.user!.dealerId });
      if (!sf) throw new AppError(404, "STOREFRONT_NOT_FOUND", "Storefront missing");
      sf.pageContent = { ...(sf.pageContent || {}), [key]: req.body };
      await sf.save();
      res.json({ data: sf.pageContent[key] });
    } catch (e) { next(e); }
  });
});

router.get("/cms/products", async (req, res, next) => {
  try { await list(req, res, Product, { ...dealerFilter(req), deletedAt: null }); } catch (e) { next(e); }
});
router.post("/cms/products", async (req, res, next) => {
  try {
    const sf = await dealerStorefront(req);
    const { brochureFile: _ignoreBrochure, ...body } = req.body || {};
    const row = await Product.create({ ...body, storefrontId: sf._id, dealerId: req.user!.dealerId, tenantId: req.user!.tenantId });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/cms/products/:id", async (req, res, next) => {
  try { await getOne(req, res, Product, { _id: req.params.id, ...dealerFilter(req), deletedAt: null }); } catch (e) { next(e); }
});
router.patch("/cms/products/:id", async (req, res, next) => {
  try {
    const { brochureFile: _ignoreBrochure, ...body } = req.body || {};
    await patchOne(req, res, Product, { _id: req.params.id, ...dealerFilter(req) }, body);
  } catch (e) { next(e); }
});
router.post("/cms/products/:id/brochure", (req, res, next) => {
  brochureUpload.single("brochure")(req, res, (err) => {
    if (err) return next(err instanceof Error ? new AppError(400, "UPLOAD_ERROR", err.message) : err);
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "BAD_REQUEST", "No file uploaded");
    const sf = await dealerStorefront(req);
    const row = await Product.findOne({ _id: req.params.id, ...dealerFilter(req), storefrontId: sf._id, deletedAt: null });
    if (!row) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      throw new AppError(404, "NOT_FOUND", "Product not found");
    }
    const prev = row.brochureFile as { storedName?: string } | undefined;
    if (prev?.storedName) {
      const oldPath = path.join(brochureUploadDir, prev.storedName);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    }
    row.set("brochureFile", {
      storedName: req.file.filename,
      originalName: req.file.originalname || "brochure.pdf",
      mimeType: req.file.mimetype || "application/pdf"
    });
    await row.save();
    res.json({ data: toJSON(row) });
  } catch (e) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    next(e);
  }
});
router.delete("/cms/products/:id/brochure", async (req, res, next) => {
  try {
    const sf = await dealerStorefront(req);
    const row = await Product.findOne({ _id: req.params.id, ...dealerFilter(req), storefrontId: sf._id, deletedAt: null });
    if (!row) throw new AppError(404, "NOT_FOUND", "Product not found");
    const prev = row.brochureFile as { storedName?: string } | undefined;
    if (prev?.storedName) {
      const oldPath = path.join(brochureUploadDir, prev.storedName);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    }
    row.set("brochureFile", undefined);
    await row.save();
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.delete("/cms/products/:id", async (req, res, next) => {
  try { await patchOne(req, res, Product, { _id: req.params.id, ...dealerFilter(req) }, { deletedAt: new Date(), isActive: false }); } catch (e) { next(e); }
});

router.get("/cms/gallery", async (req, res, next) => {
  try { await list(req, res, GalleryItem, { ...dealerFilter(req), deletedAt: null }); } catch (e) { next(e); }
});
router.post("/cms/gallery", async (req, res, next) => {
  try {
    const sf = await dealerStorefront(req);
    const row = await GalleryItem.create({ ...req.body, storefrontId: sf._id, dealerId: req.user!.dealerId, tenantId: req.user!.tenantId });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/cms/gallery/:id", async (req, res, next) => {
  try { await getOne(req, res, GalleryItem, { _id: req.params.id, ...dealerFilter(req), deletedAt: null }); } catch (e) { next(e); }
});
router.patch("/cms/gallery/:id", async (req, res, next) => {
  try { await patchOne(req, res, GalleryItem, { _id: req.params.id, ...dealerFilter(req) }, req.body); } catch (e) { next(e); }
});
router.delete("/cms/gallery/:id", async (req, res, next) => {
  try { await patchOne(req, res, GalleryItem, { _id: req.params.id, ...dealerFilter(req) }, { deletedAt: new Date(), isActive: false }); } catch (e) { next(e); }
});

router.get("/cms/jobs", async (req, res, next) => {
  try { await list(req, res, JobPosting, dealerFilter(req)); } catch (e) { next(e); }
});
router.post("/cms/jobs", async (req, res, next) => {
  try {
    const sf = await dealerStorefront(req);
    const row = await JobPosting.create({ ...req.body, storefrontId: sf._id, dealerId: req.user!.dealerId, tenantId: req.user!.tenantId });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/cms/jobs/:id", async (req, res, next) => {
  try { await getOne(req, res, JobPosting, { _id: req.params.id, ...dealerFilter(req) }); } catch (e) { next(e); }
});
router.patch("/cms/jobs/:id", async (req, res, next) => {
  try { await patchOne(req, res, JobPosting, { _id: req.params.id, ...dealerFilter(req) }, req.body); } catch (e) { next(e); }
});
router.delete("/cms/jobs/:id", async (req, res, next) => {
  try {
    const row = await JobPosting.findOneAndDelete({ _id: req.params.id, ...dealerFilter(req) });
    if (!row) throw new AppError(404, "NOT_FOUND", "Job not found");
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// inbox
[
  ["leads", Lead],
  ["finance-applications", FinanceApplication],
  ["contact-messages", ContactMessage],
  ["dealer-applications", DealerApplication],
  ["job-applications", JobApplication]
].forEach(([path, Model]) => {
  router.get(`/inbox/${path}`, async (req, res, next) => {
    try { await list(req, res, Model as any, dealerFilter(req)); } catch (e) { next(e); }
  });
  router.get(`/inbox/${path}/:id`, async (req, res, next) => {
    try { await getOne(req, res, Model as any, { _id: req.params.id, ...dealerFilter(req) }); } catch (e) { next(e); }
  });
  router.patch(`/inbox/${path}/:id`, async (req, res, next) => {
    try { await patchOne(req, res, Model as any, { _id: req.params.id, ...dealerFilter(req) }, req.body); } catch (e) { next(e); }
  });
});

router.get("/inbox/cibil-requests", async (req, res, next) => {
  try { await list(req, res, CibilRequest, dealerFilter(req)); } catch (e) { next(e); }
});
router.patch("/inbox/cibil-requests/:id", async (req, res, next) => {
  try { await patchOne(req, res, CibilRequest, { _id: req.params.id, ...dealerFilter(req) }, req.body); } catch (e) { next(e); }
});

// Spec compatibility aliases for section 4.4
router.get("/cibil-requests", async (req, res, next) => {
  try { await list(req, res, CibilRequest, dealerFilter(req)); } catch (e) { next(e); }
});
router.patch("/cibil-requests/:id", async (req, res, next) => {
  try { await patchOne(req, res, CibilRequest, { _id: req.params.id, ...dealerFilter(req) }, req.body); } catch (e) { next(e); }
});

router.get("/inbox/website-leads", async (req, res, next) => {
  try { await list(req, res, Lead, { ...dealerFilter(req), source: "website" }); } catch (e) { next(e); }
});
router.delete("/inbox/leads/:id", async (req, res, next) => {
  try {
    const row = await Lead.findOneAndUpdate(
      { _id: req.params.id, ...dealerFilter(req) },
      { deletedAt: new Date(), status: "archived" },
      { new: true }
    );
    if (!row) throw new AppError(404, "NOT_FOUND", "Lead not found");
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

// DMS summary
router.get("/dms/dashboard/summary", async (req, res, next) => {
  try {
    const dealerId = req.user!.dealerId;
    const [openLeads, pendingQuotes, bndCount, collectionsToday, lowStock] = await Promise.all([
      CRMLead.countDocuments({ dealerId, status: { $ne: "closed" } }),
      Quotation.countDocuments({ dealerId, status: { $in: ["draft", "sent"] } }),
      Invoice.countDocuments({ dealerId, status: "created" }),
      PaymentReceipt.aggregate([{ $match: { dealerId } }, { $group: { _id: null, total: { $sum: "$amountPaise" } } }]),
      SparePartInventory.countDocuments({ dealerId, qtyOnHand: { $lt: 5 } })
    ]);
    res.json({ data: { openLeads, pendingQuotes, billedNotDelivered: bndCount, collectionsToday: collectionsToday[0]?.total || 0, lowStock } });
  } catch (e) { next(e); }
});
router.get("/dms/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "");
    const dealerId = req.user!.dealerId;
    const [customers, leads, quotations, invoices, vehicles] = await Promise.all([
      Customer.find({ dealerId, name: new RegExp(q, "i") }).limit(10),
      CRMLead.find({ dealerId, phone: new RegExp(q, "i") }).limit(10),
      Quotation.find({ dealerId, quotationNo: new RegExp(q, "i") }).limit(10),
      Invoice.find({ dealerId, invoiceNo: new RegExp(q, "i") }).limit(10),
      VehicleInventory.find({ dealerId, stockNo: new RegExp(q, "i") }).limit(10)
    ]);
    res.json({ data: { customers: customers.map(toJSON), leads: leads.map(toJSON), quotations: quotations.map(toJSON), invoices: invoices.map(toJSON), vehicles: vehicles.map(toJSON) } });
  } catch (e) { next(e); }
});
router.get("/dms/notifications", async (req, res, next) => {
  try { await list(req, res, Notification, { userId: req.user!.sub, ...(req.query.unreadOnly ? { isRead: false } : {}) }); } catch (e) { next(e); }
});
router.patch("/dms/notifications/:id/read", async (req, res, next) => {
  try { await patchOne(req, res, Notification, { _id: req.params.id, userId: req.user!.sub }, { isRead: true }); } catch (e) { next(e); }
});
router.post("/dms/notifications/read-all", async (req, res, next) => {
  try { await Notification.updateMany({ userId: req.user!.sub, isRead: false }, { isRead: true }); res.json({ data: { success: true } }); } catch (e) { next(e); }
});

function registerCrud(base: string, Model: any, config?: { codeField?: string; dealerScoped?: boolean; tenantScoped?: boolean; }) {
  const codeField = config?.codeField;
  const scope = (req: any) => ({ ...(config?.dealerScoped === false ? {} : { dealerId: req.user!.dealerId }), ...(config?.tenantScoped ? { tenantId: req.user!.tenantId } : {}) });

  router.get(base, async (req, res, next) => { try { await list(req, res, Model, scope(req)); } catch (e) { next(e); } });
  router.post(base, async (req, res, next) => {
    try {
      const data = { ...req.body, ...scope(req) };
      const row = await Model.create(data);
      res.status(201).json({ data: toJSON(row) });
    } catch (e) { next(e); }
  });
  const param = codeField ? `:${codeField}` : ":id";
  router.get(`${base}/${param}`, async (req, res, next) => {
    try {
      const value = req.params[codeField || "id"];
      const filter = codeField ? { [codeField]: value, ...scope(req) } : { _id: value, ...scope(req) };
      await getOne(req, res, Model, filter);
    } catch (e) { next(e); }
  });
  router.patch(`${base}/${param}`, async (req, res, next) => {
    try {
      const value = req.params[codeField || "id"];
      const filter = codeField ? { [codeField]: value, ...scope(req) } : { _id: value, ...scope(req) };
      await patchOne(req, res, Model, filter, req.body);
    } catch (e) { next(e); }
  });
  router.delete(`${base}/${param}`, async (req, res, next) => {
    try {
      const value = req.params[codeField || "id"];
      const filter = codeField ? { [codeField]: value, ...scope(req) } : { _id: value, ...scope(req) };
      const row = await Model.findOneAndDelete(filter);
      if (!row) throw new AppError(404, "NOT_FOUND", "Resource not found");
      res.json({ data: { success: true } });
    } catch (e) { next(e); }
  });
}

registerCrud("/dms/crm/customers", Customer);
registerCrud("/dms/crm/leads", CRMLead);
registerCrud("/dms/crm/visits", Visit);
registerCrud("/dms/crm/activities", Activity);
registerCrud("/dms/crm/quotations", Quotation);
router.get("/dms/crm/quotations/:id/revisions", async (req, res, next) => {
  try {
    const row = await Quotation.findOne({ _id: req.params.id, dealerId: req.user!.dealerId });
    if (!row) throw new AppError(404, "NOT_FOUND", "Quotation not found");
    res.json({ data: row.revisions || [] });
  } catch (e) { next(e); }
});
router.post("/dms/crm/quotations/:id/revisions", async (req, res, next) => {
  try {
    const row = await Quotation.findOne({ _id: req.params.id, dealerId: req.user!.dealerId });
    if (!row) throw new AppError(404, "NOT_FOUND", "Quotation not found");
    row.revisions.push({ createdAt: new Date(), snapshot: req.body.snapshot || row.toObject() });
    await row.save();
    res.status(201).json({ data: row.revisions[row.revisions.length - 1] });
  } catch (e) { next(e); }
});

registerCrud("/dms/orders", B2BOrder, { codeField: "orderNo" });
router.post("/dms/orders/:orderNo/receive", async (req, res, next) => {
  try {
    const row = await B2BOrder.findOne({ orderNo: req.params.orderNo, dealerId: req.user!.dealerId });
    if (!row) throw new AppError(404, "NOT_FOUND", "Order not found");
    row.receiveHistory.push({ receivedAt: new Date(), lines: req.body.lines || [], byUserId: req.user!.sub });
    await row.save();
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

registerCrud("/dms/payment-receipts", PaymentReceipt, { codeField: "receiptNo" });
router.get("/dms/payment-receipts/:receiptNo/pdf", async (req, res) => {
  res.json({ data: { message: "PDF streaming placeholder", receiptNo: req.params.receiptNo } });
});

router.get("/dms/outstanding/summary", async (req, res, next) => {
  try {
    const dealerId = req.user!.dealerId;
    const total = await Invoice.aggregate([{ $match: { dealerId } }, { $group: { _id: null, total: { $sum: "$amountPaise" } } }]);
    res.json({ data: { totalOutstandingPaise: total[0]?.total || 0 } });
  } catch (e) { next(e); }
});
router.get("/dms/outstanding/lines", async (req, res, next) => {
  try { await list(req, res, Invoice, { dealerId: req.user!.dealerId }); } catch (e) { next(e); }
});
registerCrud("/dms/ho-deviation-requests", DeviationRequest);
registerCrud("/dms/collection-tracker/plans", CollectionPlan);
registerCrud("/dms/invoices", Invoice, { codeField: "invoiceNo" });
router.get("/dms/invoices/:invoiceNo/pdf", async (req, res) => {
  res.json({ data: { message: "PDF streaming placeholder", invoiceNo: req.params.invoiceNo } });
});
registerCrud("/dms/invoice-cancellations", InvoiceCancellation);
router.get("/dms/delivery/billed-not-delivered", async (req, res, next) => {
  try { await list(req, res, Invoice, { dealerId: req.user!.dealerId, status: "created" }); } catch (e) { next(e); }
});
registerCrud("/dms/delivery/checklists", DeliveryChecklist);
registerCrud("/dms/delivery/gate-passes", GatePass);
registerCrud("/dms/delivery/confirmations", DeliveryConfirmation);
registerCrud("/dms/inventory/vehicles", VehicleInventory, { codeField: "stockNo" });
registerCrud("/dms/inventory/spare-parts", SparePartInventory, { codeField: "partNo" });
registerCrud("/dms/inventory/batteries", BatteryInventory, { codeField: "batteryNo" });
registerCrud("/dms/stock-receipts", StockReceipt);
registerCrud("/dms/purchase-orders", PurchaseOrder);
router.post("/dms/purchase-orders/:id/receive", async (req, res, next) => {
  try {
    const row = await PurchaseOrder.findOne({ _id: req.params.id, dealerId: req.user!.dealerId });
    if (!row) throw new AppError(404, "NOT_FOUND", "Purchase order not found");
    const receipt = await StockReceipt.create({ dealerId: req.user!.dealerId, tenantId: req.user!.tenantId, receiptNo: `SR-${Date.now()}`, status: "received", lines: row.lines });
    res.status(201).json({ data: toJSON(receipt) });
  } catch (e) { next(e); }
});
registerCrud("/dms/service/jobs", ServiceJob);
router.post("/dms/service/jobs/:id/parts-issue", async (req, res, next) => {
  try {
    const row = await ServiceJob.findOne({ _id: req.params.id, dealerId: req.user!.dealerId });
    if (!row) throw new AppError(404, "NOT_FOUND", "Service job not found");
    row.partsIssued.push(...(req.body.parts || []));
    await row.save();
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/dms/accounts/cash-bank", async (req, res, next) => {
  try { await list(req, res, AccountEntry, { dealerId: req.user!.dealerId, type: "cash_bank" }); } catch (e) { next(e); }
});
router.get("/dms/accounts/customer-ledger", async (req, res, next) => {
  try { await list(req, res, AccountEntry, { dealerId: req.user!.dealerId, customerId: req.query.custId }); } catch (e) { next(e); }
});
router.get("/dms/accounts/ledger", async (req, res, next) => {
  try { await list(req, res, AccountEntry, { dealerId: req.user!.dealerId }); } catch (e) { next(e); }
});
router.get("/dms/accounts/deposits", async (req, res, next) => {
  try { await list(req, res, AccountEntry, { dealerId: req.user!.dealerId, type: "deposit" }); } catch (e) { next(e); }
});
router.post("/dms/accounts/deposits", async (req, res, next) => {
  try {
    const row = await AccountEntry.create({ dealerId: req.user!.dealerId, tenantId: req.user!.tenantId, type: "deposit", ...req.body });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/dms/accounts/expenses", async (req, res, next) => {
  try { await list(req, res, AccountEntry, { dealerId: req.user!.dealerId, type: "expense" }); } catch (e) { next(e); }
});
router.post("/dms/accounts/expenses", async (req, res, next) => {
  try {
    const row = await AccountEntry.create({ dealerId: req.user!.dealerId, tenantId: req.user!.tenantId, type: "expense", ...req.body });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/dms/accounts/expenses/:id", async (req, res, next) => {
  try { await getOne(req, res, AccountEntry, { _id: req.params.id, dealerId: req.user!.dealerId, type: "expense" }); } catch (e) { next(e); }
});
router.patch("/dms/accounts/expenses/:id", async (req, res, next) => {
  try { await patchOne(req, res, AccountEntry, { _id: req.params.id, dealerId: req.user!.dealerId, type: "expense" }, req.body); } catch (e) { next(e); }
});
router.get("/dms/reports/sales", async (req, res) => res.json({ data: { report: "sales", filters: req.query } }));
router.get("/dms/reports/inventory-aging", async (req, res) => res.json({ data: { report: "inventory-aging", filters: req.query } }));
router.get("/dms/reports/collections", async (req, res) => res.json({ data: { report: "collections", filters: req.query } }));
router.post("/dms/reports/export", async (req, res, next) => {
  try {
    const job = await ReportExportJob.create({
      ownerType: "dealer",
      ownerId: req.user!.dealerId,
      reportKey: req.body.reportKey,
      format: req.body.format,
      filters: req.body.filters,
      status: "queued"
    });
    res.status(201).json({ data: toJSON(job) });
  } catch (e) { next(e); }
});
router.get("/dms/reports/export-jobs/:jobId", async (req, res, next) => {
  try { await getOne(req, res, ReportExportJob, { _id: req.params.jobId, ownerType: "dealer", ownerId: req.user!.dealerId }); } catch (e) { next(e); }
});

export default router;
