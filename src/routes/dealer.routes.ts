// @ts-nocheck
import { Router } from "express";
import { authJwt, requireDealerScope } from "../middleware/authJwt";
import { requireModulePermission } from "../middleware/panelPermissions";
import { buildSignedUploadParams } from "../services/cloudinary.service";
import { buildDefaultHeroForDealer } from "../services/heroCms.service";
import { buildDefaultFeaturesForDealer } from "../services/featuresCms.service";
import { syncShowcaseProductsForDealer } from "../services/productsCms.service";
import { syncDefaultGalleryForDealer } from "../services/galleryCms.service";
import { normalizeFooterCms } from "../services/footerCms.service";
import {
  cibilPaymentAdminView,
  mergeCibilPaymentUpdate
} from "../services/cibilPaymentConfig.service";
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
import ServiceInvoice from "../models/ServiceInvoice";
import AccountEntry from "../models/AccountEntry";
import Employee from "../models/Employee";
import Attendance from "../models/Attendance";
import ReportExportJob from "../models/ReportExportJob";
import { AppError } from "../utils/errors";
import { registerMasterRecordRoutes } from "./masterRecords.routes";
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
  if (p.startsWith("/dms/hr/")) return requireModulePermission("hr")(req, res, next);
  if (p.startsWith("/masters")) return requireModulePermission("master_management")(req, res, next);
  return next();
});

registerMasterRecordRoutes(router);

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

router.post("/cms/home/hero/seed-default", async (req, res, next) => {
  try {
    const dealerId = req.user!.dealerId;
    if (!dealerId) throw new AppError(403, "FORBIDDEN", "Dealer scope missing");
    const storefronts = await Storefront.find({ dealerId });
    if (!storefronts.length) throw new AppError(404, "STOREFRONT_NOT_FOUND", "Storefront missing");
    const hero = await buildDefaultHeroForDealer(dealerId);
    for (const sf of storefronts) {
      sf.homeSections = { ...(sf.homeSections || {}), hero };
      await sf.save();
    }
    res.json({ data: hero });
  } catch (e) { next(e); }
});

router.get("/cms/cibil-payment", async (req, res, next) => {
  try {
    const sf = await dealerStorefront(req);
    res.json({ data: cibilPaymentAdminView(sf) });
  } catch (e) { next(e); }
});

router.put("/cms/cibil-payment", async (req, res, next) => {
  try {
    const sf = await Storefront.findOne({ dealerId: req.user!.dealerId });
    if (!sf) throw new AppError(404, "STOREFRONT_NOT_FOUND", "Storefront missing");
    const existing = (sf.cibilPayment && typeof sf.cibilPayment === "object"
      ? sf.cibilPayment
      : {}) as Record<string, unknown>;
    try {
      sf.cibilPayment = mergeCibilPaymentUpdate(existing as any, req.body || {});
    } catch (err) {
      throw new AppError(400, "BAD_REQUEST", err instanceof Error ? err.message : "Invalid CIBIL payment settings");
    }
    await sf.save();
    res.json({ data: cibilPaymentAdminView(sf) });
  } catch (e) { next(e); }
});

router.post("/cms/home/features/seed-default", async (req, res, next) => {
  try {
    const sf = await Storefront.findOne({ dealerId: req.user!.dealerId });
    if (!sf) throw new AppError(404, "STOREFRONT_NOT_FOUND", "Storefront missing");
    const features = await buildDefaultFeaturesForDealer(req.user!.dealerId);
    sf.homeSections = { ...(sf.homeSections || {}), features };
    await sf.save();
    res.json({ data: features });
  } catch (e) { next(e); }
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
  try {
    const sf = await dealerStorefront(req);
    res.json({ data: normalizeFooterCms(sf.footer || {}) });
  } catch (e) { next(e); }
});
router.put("/cms/footer", async (req, res, next) => {
  try {
    const footer = normalizeFooterCms(req.body);
    const sf = await Storefront.findOneAndUpdate({ dealerId: req.user!.dealerId }, { footer }, { new: true });
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
router.post("/cms/products/sync-showcase", async (req, res, next) => {
  try {
    const dealerId = req.user!.dealerId;
    if (!dealerId) throw new AppError(403, "FORBIDDEN", "Dealer scope missing");
    const result = await syncShowcaseProductsForDealer(dealerId, req.user!.tenantId);
    res.json({ data: result });
  } catch (e) { next(e); }
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
router.post("/cms/gallery/sync-default", async (req, res, next) => {
  try {
    const dealerId = req.user!.dealerId;
    if (!dealerId) throw new AppError(403, "FORBIDDEN", "Dealer scope missing");
    const result = await syncDefaultGalleryForDealer(dealerId, req.user!.tenantId);
    res.json({ data: result });
  } catch (e) { next(e); }
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

function registerCrud(base: string, Model: any, config?: { codeField?: string; dealerScoped?: boolean; tenantScoped?: boolean; skipPost?: boolean; skipPatch?: boolean; }) {
  const codeField = config?.codeField;
  const scope = (req: any) => ({ ...(config?.dealerScoped === false ? {} : { dealerId: req.user!.dealerId }), ...(config?.tenantScoped ? { tenantId: req.user!.tenantId } : {}) });

  router.get(base, async (req, res, next) => { try { await list(req, res, Model, scope(req)); } catch (e) { next(e); } });
  if (!config?.skipPost) {
    router.post(base, async (req, res, next) => {
      try {
        const data = { ...req.body, ...scope(req) };
        const row = await Model.create(data);
        res.status(201).json({ data: toJSON(row) });
      } catch (e) { next(e); }
    });
  }
  const param = codeField ? `:${codeField}` : ":id";
  router.get(`${base}/${param}`, async (req, res, next) => {
    try {
      const value = req.params[codeField || "id"];
      const filter = codeField ? { [codeField]: value, ...scope(req) } : { _id: value, ...scope(req) };
      await getOne(req, res, Model, filter);
    } catch (e) { next(e); }
  });
  if (!config?.skipPatch) {
    router.patch(`${base}/${param}`, async (req, res, next) => {
      try {
        const value = req.params[codeField || "id"];
        const filter = codeField ? { [codeField]: value, ...scope(req) } : { _id: value, ...scope(req) };
        await patchOne(req, res, Model, filter, req.body);
      } catch (e) { next(e); }
    });
  }
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

router.get("/dms/crm/customers", async (req, res, next) => {
  try {
    const { backfillCustomerIdsForDealer } = await import("../services/customerId.service");
    await backfillCustomerIdsForDealer(req.user!.dealerId);
    await list(req, res, Customer, { dealerId: req.user!.dealerId });
  } catch (e) {
    next(e);
  }
});
router.post("/dms/crm/customers", async (req, res, next) => {
  try {
    const { nextCustomerId } = await import("../services/customerId.service");
    const { normalizeCustomerKycForSave } = await import("../utils/customerKyc");
    const customerId = await nextCustomerId(req.user!.dealerId);
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    const row = await Customer.create({
      ...body,
      dealerId: req.user!.dealerId,
      tenantId: req.user!.tenantId,
      customerId,
      kyc: normalizeCustomerKycForSave(body.kyc),
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) {
    next(e);
  }
});
router.get("/dms/crm/customers/:customerId", async (req, res, next) => {
  try {
    await getOne(req, res, Customer, { customerId: req.params.customerId, dealerId: req.user!.dealerId });
  } catch (e) {
    next(e);
  }
});
router.patch("/dms/crm/customers/:customerId", async (req, res, next) => {
  try {
    const body = { ...(req.body && typeof req.body === "object" ? req.body : {}) };
    delete body.customerId;
    delete body.dealerId;
    delete body.tenantId;
    delete body.id;
    delete body._id;
    if (body.fleetSize != null) body.fleetSize = Number(body.fleetSize) || 0;
    const { normalizeCustomerKycForSave } = await import("../utils/customerKyc");
    body.kyc = normalizeCustomerKycForSave(body.kyc);
    await patchOne(
      req,
      res,
      Customer,
      { customerId: req.params.customerId, dealerId: req.user!.dealerId },
      body,
    );
  } catch (e) {
    next(e);
  }
});
router.delete("/dms/crm/customers/:customerId", async (req, res, next) => {
  try {
    const row = await Customer.findOneAndDelete({
      customerId: req.params.customerId,
      dealerId: req.user!.dealerId,
    });
    if (!row) throw new AppError(404, "NOT_FOUND", "Customer not found");
    res.json({ data: { success: true } });
  } catch (e) {
    next(e);
  }
});

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

router.post("/dms/payment-receipts", async (req, res, next) => {
  try {
    const { createCustomerLedgerEntryFromPayment } = await import("../services/customerLedger.service");
    const { createCashBankFromPayment } = await import("../services/accounts.service");
    const data = { ...req.body, dealerId: req.user!.dealerId, tenantId: req.user!.tenantId };
    const row = await PaymentReceipt.create(data);
    await createCustomerLedgerEntryFromPayment(row);
    await createCashBankFromPayment(row);
    res.status(201).json({ data: toJSON(row) });
  } catch (e) {
    next(e);
  }
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
router.post("/dms/ho-deviation-requests", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const amountPaise =
      Number(body.amountPaise) ||
      Math.round((Number(body.amount) || Number(body.os) || 0) * 100);
    const payload =
      body.payload && typeof body.payload === "object" ? body.payload : {};
    const row = await DeviationRequest.create({
      dealerId: req.user!.dealerId,
      tenantId: req.user!.tenantId,
      requestNo: String(body.requestNo || `HO-${Date.now()}`),
      requestType: String(body.requestType || "ho_deviation"),
      customerId: body.customerId ? String(body.customerId) : undefined,
      customerName: body.customerName ? String(body.customerName) : undefined,
      quotationId: body.quotationId
        ? String(body.quotationId)
        : payload.quoteNo
          ? String(payload.quoteNo)
          : undefined,
      amountPaise,
      status: String(body.status || "pending").toLowerCase(),
      reason: body.reason ? String(body.reason) : undefined,
      payload: {
        ...payload,
        custId: payload.custId || body.customerId,
        name: payload.name || body.customerName,
        quoteNo: payload.quoteNo || body.quotationId,
        collectionPlan: payload.collectionPlan,
        owner: payload.owner,
        ownerName: payload.ownerName,
        requestedBy: payload.requestedBy,
        raisedDate: payload.raisedDate,
      },
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) {
    next(e);
  }
});
router.patch("/dms/ho-deviation-requests/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    const dealerId = req.user!.dealerId;
    const filter =
      /^[a-fA-F0-9]{24}$/.test(id)
        ? { _id: id, dealerId }
        : { requestNo: id, dealerId };
    await patchOne(req, res, DeviationRequest, filter, req.body);
  } catch (e) {
    next(e);
  }
});
registerCrud("/dms/ho-deviation-requests", DeviationRequest, { skipPost: true, skipPatch: true });
registerCrud("/dms/collection-tracker/plans", CollectionPlan);
registerCrud("/dms/invoices", Invoice, { codeField: "invoiceNo", skipPost: true, skipPatch: true });
router.post("/dms/invoices", async (req, res, next) => {
  try {
    const row = await Invoice.create({
      ...req.body,
      dealerId: req.user!.dealerId,
      tenantId: req.user!.tenantId,
    });
    const { syncInventoryFromInvoice } = await import("../services/inventorySync.service");
    const { createCustomerLedgerEntryFromInvoice } = await import("../services/accounts.service");
    await syncInventoryFromInvoice(req.user!.dealerId, req.user!.tenantId, row.toObject());
    await createCustomerLedgerEntryFromInvoice(row);
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.patch("/dms/invoices/:invoiceNo", async (req, res, next) => {
  try {
    const filter = { invoiceNo: req.params.invoiceNo, dealerId: req.user!.dealerId };
    const row = await Invoice.findOneAndUpdate(filter, req.body, { new: true });
    if (!row) throw new AppError(404, "NOT_FOUND", "Invoice not found");
    const { syncInventoryFromInvoice } = await import("../services/inventorySync.service");
    await syncInventoryFromInvoice(req.user!.dealerId, req.user!.tenantId, row.toObject());
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/dms/invoices/:invoiceNo/pdf", async (req, res) => {
  res.json({ data: { message: "PDF streaming placeholder", invoiceNo: req.params.invoiceNo } });
});
router.patch("/dms/invoice-cancellations/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    const dealerId = req.user!.dealerId;
    const filter =
      /^[a-fA-F0-9]{24}$/.test(id)
        ? { _id: id, dealerId }
        : { cancellationId: id, dealerId };
    await patchOne(req, res, InvoiceCancellation, filter, req.body);
  } catch (e) {
    next(e);
  }
});
registerCrud("/dms/invoice-cancellations", InvoiceCancellation, { skipPatch: true });
router.get("/dms/delivery/billed-not-delivered", async (req, res, next) => {
  try { await list(req, res, Invoice, { dealerId: req.user!.dealerId, status: "created" }); } catch (e) { next(e); }
});
registerCrud("/dms/delivery/checklists", DeliveryChecklist, { skipPatch: true });
router.patch("/dms/delivery/checklists/:id", async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, dealerId: req.user!.dealerId };
    const row = await DeliveryChecklist.findOneAndUpdate(filter, req.body, { new: true });
    if (!row) throw new AppError(404, "NOT_FOUND", "Checklist not found");
    const { syncInventoryFromChecklist } = await import("../services/inventorySync.service");
    await syncInventoryFromChecklist(req.user!.dealerId, req.user!.tenantId, row.toObject());
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
registerCrud("/dms/delivery/gate-passes", GatePass);
registerCrud("/dms/delivery/confirmations", DeliveryConfirmation, { skipPatch: true });
router.patch("/dms/delivery/confirmations/:id", async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, dealerId: req.user!.dealerId };
    const row = await DeliveryConfirmation.findOneAndUpdate(filter, req.body, { new: true });
    if (!row) throw new AppError(404, "NOT_FOUND", "Confirmation not found");
    const { syncInventoryFromDeliveryConfirmation } = await import("../services/inventorySync.service");
    await syncInventoryFromDeliveryConfirmation(req.user!.dealerId, req.user!.tenantId, row.toObject());
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
registerCrud("/dms/inventory/vehicles", VehicleInventory, { codeField: "stockNo" });
registerCrud("/dms/inventory/spare-parts", SparePartInventory, { codeField: "partNo" });
registerCrud("/dms/inventory/batteries", BatteryInventory, { codeField: "batteryNo" });
registerCrud("/dms/stock-receipts", StockReceipt, { skipPost: true });
router.post("/dms/stock-receipts", async (req, res, next) => {
  try {
    const poId = String(req.body?.poId || "").trim();
    if (!poId) throw new AppError(400, "VALIDATION", "poId is required");
    const { receiveGrnAgainstPo } = await import("../services/inventory.service");
    const result = await receiveGrnAgainstPo(req.user!.dealerId, req.user!.tenantId, poId, {
      lines: Array.isArray(req.body?.lines) ? req.body.lines : [],
      checkedBy: String(req.body?.checkedBy || "Warehouse"),
      remarks: req.body?.remarks,
      qualityRemarks: req.body?.qualityRemarks,
      actionableDate: req.body?.actionableDate,
    });
    if (!result) throw new AppError(404, "NOT_FOUND", "Purchase order not found");
    res.status(201).json({
      data: toJSON(result.receipt),
      meta: {
        purchaseOrder: toJSON(result.purchaseOrder),
        createdVehicles: result.createdVehicles,
        updatedParts: result.updatedParts,
        updatedBatteries: result.updatedBatteries,
      },
    });
  } catch (e) { next(e); }
});
registerCrud("/dms/purchase-orders", PurchaseOrder, { skipPost: true, skipPatch: true });
router.post("/dms/purchase-orders", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const normalizedLines = lines.map((line: Record<string, unknown>) => ({
      ...line,
      orderedQty: Number(line.orderedQty ?? line.qty) || 0,
      receivedQty: Number(line.receivedQty) || 0,
      qty: Number(line.orderedQty ?? line.qty) || 0,
    }));
    const row = await PurchaseOrder.create({
      ...body,
      lines: normalizedLines,
      status: body.status || "ordered",
      dealerId: req.user!.dealerId,
      tenantId: req.user!.tenantId,
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.patch("/dms/purchase-orders/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const filter = /^[a-fA-F0-9]{24}$/.test(id)
      ? { _id: id, dealerId: req.user!.dealerId }
      : { poNo: id, dealerId: req.user!.dealerId };
    const row = await PurchaseOrder.findOneAndUpdate(filter, req.body, { new: true });
    if (!row) throw new AppError(404, "NOT_FOUND", "Purchase order not found");
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.post("/dms/purchase-orders/:id/receive", async (req, res, next) => {
  try {
    const { receiveGrnAgainstPo, receivePurchaseOrder } = await import("../services/inventory.service");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const hasLines = Array.isArray(body.lines) && body.lines.length > 0;
    const result = hasLines
      ? await receiveGrnAgainstPo(req.user!.dealerId, req.user!.tenantId, req.params.id, {
          lines: body.lines,
          checkedBy: String(body.checkedBy || "Warehouse Manager"),
          remarks: body.remarks,
          qualityRemarks: body.qualityRemarks,
          actionableDate: body.actionableDate,
        })
      : await receivePurchaseOrder(req.user!.dealerId, req.user!.tenantId, req.params.id);
    if (!result) throw new AppError(404, "NOT_FOUND", "Purchase order not found");
    res.status(201).json({
      data: toJSON(result.receipt),
      meta: {
        purchaseOrder: toJSON((result as { purchaseOrder?: unknown }).purchaseOrder || {}),
        createdVehicles: result.createdVehicles,
        updatedParts: result.updatedParts,
        updatedBatteries: result.updatedBatteries,
      },
    });
  } catch (e) { next(e); }
});
registerCrud("/dms/service/jobs", ServiceJob, { codeField: "jobNo", skipPost: true, skipPatch: true });
router.post("/dms/service/jobs", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    if (!body.jobNo) body.jobNo = `JC-${Date.now().toString(36).toUpperCase()}`;
    const row = await ServiceJob.create({
      ...body,
      dealerId: req.user!.dealerId,
      tenantId: req.user!.tenantId,
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.patch("/dms/service/jobs/:jobNo", async (req, res, next) => {
  try {
    const filter = { jobNo: req.params.jobNo, dealerId: req.user!.dealerId };
    const row = await ServiceJob.findOneAndUpdate(filter, req.body, { new: true });
    if (!row) throw new AppError(404, "NOT_FOUND", "Service job not found");
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
registerCrud("/dms/service/invoices", ServiceInvoice, { codeField: "invoiceNo", skipPost: true, skipPatch: true });
router.post("/dms/service/invoices", async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    if (!body.invoiceNo) body.invoiceNo = `SI-${Date.now().toString(36).toUpperCase()}`;
    const row = await ServiceInvoice.create({
      ...body,
      dealerId: req.user!.dealerId,
      tenantId: req.user!.tenantId,
    });
    if (body.jobNo || body.jobCardId) {
      const jobNo = String(body.jobNo || body.jobCardId || "").trim();
      if (jobNo) {
        await ServiceJob.findOneAndUpdate(
          { jobNo, dealerId: req.user!.dealerId },
          { status: "closed" },
        );
      }
    }
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.patch("/dms/service/invoices/:invoiceNo", async (req, res, next) => {
  try {
    const filter = { invoiceNo: req.params.invoiceNo, dealerId: req.user!.dealerId };
    const row = await ServiceInvoice.findOneAndUpdate(filter, req.body, { new: true });
    if (!row) throw new AppError(404, "NOT_FOUND", "Service invoice not found");
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
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
router.get("/dms/accounts/cash-bank/summary", async (req, res, next) => {
  try {
    const { buildCashBankSummary } = await import("../services/accounts.service");
    const summary = await buildCashBankSummary(req.user!.dealerId);
    res.json({ data: summary });
  } catch (e) { next(e); }
});
router.get("/dms/accounts/customer-ledger", async (req, res, next) => {
  try { await list(req, res, AccountEntry, { dealerId: req.user!.dealerId, customerId: req.query.custId }); } catch (e) { next(e); }
});
router.get("/dms/accounts/ledger", async (req, res, next) => {
  try {
    await list(req, res, AccountEntry, {
      dealerId: req.user!.dealerId,
      type: { $in: ["customer_payment", "customer_invoice"] },
    });
  } catch (e) { next(e); }
});
router.get("/dms/accounts/deposits", async (req, res, next) => {
  try { await list(req, res, AccountEntry, { dealerId: req.user!.dealerId, type: "deposit" }); } catch (e) { next(e); }
});
router.post("/dms/accounts/deposits", async (req, res, next) => {
  try {
    const { createDepositEntry } = await import("../services/accounts.service");
    const row = await createDepositEntry(req.user!.dealerId, req.user!.tenantId, req.body || {});
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/dms/accounts/expenses", async (req, res, next) => {
  try { await list(req, res, AccountEntry, { dealerId: req.user!.dealerId, type: "expense" }); } catch (e) { next(e); }
});
router.post("/dms/accounts/expenses", async (req, res, next) => {
  try {
    const { createExpenseEntry } = await import("../services/accounts.service");
    const row = await createExpenseEntry(req.user!.dealerId, req.user!.tenantId, req.body || {});
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/dms/accounts/expenses/:id", async (req, res, next) => {
  try { await getOne(req, res, AccountEntry, { _id: req.params.id, dealerId: req.user!.dealerId, type: "expense" }); } catch (e) { next(e); }
});
router.patch("/dms/accounts/expenses/:id", async (req, res, next) => {
  try {
    const { patchExpenseEntry } = await import("../services/accounts.service");
    const row = await patchExpenseEntry(req.user!.dealerId, req.params.id, req.body || {});
    if (!row) throw new AppError(404, "NOT_FOUND", "Expense not found");
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.post("/dms/hr/employees", async (req, res, next) => {
  try {
    const { nextDealerEmployeeId, salaryPaiseFromBody } = await import("../services/hr.service");
    const dealerId = req.user!.dealerId;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const employeeId = String(body.employeeId || "").trim() || (await nextDealerEmployeeId(dealerId));
    const row = await Employee.create({
      ...body,
      dealerId,
      tenantId: req.user!.tenantId,
      employeeId,
      salaryPaise: salaryPaiseFromBody(body),
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
registerCrud("/dms/hr/employees", Employee, { codeField: "employeeId", skipPost: true, skipPatch: true });
router.patch("/dms/hr/employees/:employeeId", async (req, res, next) => {
  try {
    const { salaryPaiseFromBody } = await import("../services/hr.service");
    const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
    if (body.salary != null || body.salaryPaise != null) {
      body.salaryPaise = salaryPaiseFromBody(body);
      delete body.salary;
    }
    await patchOne(
      req,
      res,
      Employee,
      { employeeId: req.params.employeeId, dealerId: req.user!.dealerId },
      body,
    );
  } catch (e) { next(e); }
});
router.get("/dms/hr/attendance", async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = { dealerId: req.user!.dealerId };
    const date = String(req.query.date || "").trim();
    const month = String(req.query.month || "").trim();
    if (date) filter.date = date;
    else if (month && /^\d{4}-\d{2}$/.test(month)) filter.date = new RegExp(`^${month}`);
    await list(req, res, Attendance, filter, { date: -1, employeeId: 1 });
  } catch (e) { next(e); }
});
router.post("/dms/hr/attendance/batch", async (req, res, next) => {
  try {
    const { saveAttendanceBatch } = await import("../services/hr.service");
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const rows = await saveAttendanceBatch(
      req.user!.dealerId,
      req.user!.tenantId,
      String(body.date || ""),
      Array.isArray(body.entries) ? body.entries : [],
    );
    res.status(201).json({ data: rows.map(toJSON) });
  } catch (e) { next(e); }
});
router.get("/dms/hr/summary", async (req, res, next) => {
  try {
    const { buildHrSummary } = await import("../services/hr.service");
    const summary = await buildHrSummary(req.user!.dealerId, String(req.query.date || ""));
    res.json({ data: summary });
  } catch (e) { next(e); }
});
router.get("/dms/reports/hr", async (req, res, next) => {
  try {
    const { buildHrSummary } = await import("../services/hr.service");
    const summary = await buildHrSummary(req.user!.dealerId, String(req.query.date || ""));
    res.json({ data: summary });
  } catch (e) { next(e); }
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
