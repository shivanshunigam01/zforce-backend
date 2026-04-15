// @ts-nocheck
import { Router } from "express";
import { authJwt, requireTenantScope } from "../middleware/authJwt";
import { getPagination } from "../utils/pagination";
import { paginated, toJSON } from "../utils/api";
import { AppError } from "../utils/errors";
import DistributorProduct from "../models/DistributorProduct";
import Category from "../models/Category";
import Area from "../models/Area";
import Storefront from "../models/Storefront";
import DealerApplication from "../models/DealerApplication";
import CRMLead from "../models/CRMLead";
import Activity from "../models/Activity";
import Visit from "../models/Visit";
import B2BOrder from "../models/B2BOrder";
import Dispatch from "../models/Dispatch";
import DistributorStock from "../models/DistributorStock";
import GRN from "../models/GRN";
import StockTransfer from "../models/StockTransfer";
import Invoice from "../models/Invoice";
import PaymentReceipt from "../models/PaymentReceipt";
import AccountEntry from "../models/AccountEntry";
import Lead from "../models/Lead";
import ContactMessage from "../models/ContactMessage";
import ReportExportJob from "../models/ReportExportJob";
import User from "../models/User";
import Product from "../models/Product";

const router = Router({ mergeParams: true });
router.use(authJwt(["distributor", "super_admin"]), requireTenantScope);

function tenantFilter(req: any) { return { tenantId: req.params.tenantId }; }
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

router.get("/dashboard", async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId;
    const [dealers, orders, inventory, leads] = await Promise.all([
      Storefront.countDocuments({ tenantId }),
      B2BOrder.countDocuments({ tenantId }),
      DistributorStock.countDocuments({ tenantId }),
      CRMLead.countDocuments({ tenantId })
    ]);
    res.json({ data: { dealers, orders, inventoryLines: inventory, leads } });
  } catch (e) { next(e); }
});

function registerCrud(base: string, Model: any, config?: { codeField?: string; extraFilter?: (req:any)=>any; }) {
  const codeField = config?.codeField;
  router.get(base, async (req, res, next) => {
    try { await list(req, res, Model, { ...tenantFilter(req), ...(config?.extraFilter ? config.extraFilter(req) : {}) }); } catch (e) { next(e); }
  });
  router.post(base, async (req, res, next) => {
    try {
      const row = await Model.create({ ...req.body, ...tenantFilter(req) });
      res.status(201).json({ data: toJSON(row) });
    } catch (e) { next(e); }
  });
  const param = codeField ? `:${codeField}` : ":id";
  router.get(`${base}/${param}`, async (req, res, next) => {
    try {
      const value = req.params[codeField || "id"];
      const filter = { ...tenantFilter(req), ...(config?.extraFilter ? config.extraFilter(req) : {}), ...(codeField ? { [codeField]: value } : { _id: value }) };
      await getOne(req, res, Model, filter);
    } catch (e) { next(e); }
  });
  router.patch(`${base}/${param}`, async (req, res, next) => {
    try {
      const value = req.params[codeField || "id"];
      const filter = { ...tenantFilter(req), ...(config?.extraFilter ? config.extraFilter(req) : {}), ...(codeField ? { [codeField]: value } : { _id: value }) };
      await patchOne(req, res, Model, filter, req.body);
    } catch (e) { next(e); }
  });
  router.delete(`${base}/${param}`, async (req, res, next) => {
    try {
      const value = req.params[codeField || "id"];
      const filter = { ...tenantFilter(req), ...(config?.extraFilter ? config.extraFilter(req) : {}), ...(codeField ? { [codeField]: value } : { _id: value }) };
      const row = await Model.findOneAndDelete(filter);
      if (!row) throw new AppError(404, "NOT_FOUND", "Resource not found");
      res.json({ data: { success: true } });
    } catch (e) { next(e); }
  });
}

registerCrud("/masters/products", DistributorProduct);
registerCrud("/masters/categories", Category);
registerCrud("/masters/areas", Area);

router.get("/masters/areas/:id/dealers", async (req, res, next) => {
  try { await getOne(req, res, Area, { _id: req.params.id, ...tenantFilter(req) }); } catch (e) { next(e); }
});
router.post("/masters/areas/:id/dealers", async (req, res, next) => {
  try {
    const row = await Area.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!row) throw new AppError(404, "NOT_FOUND", "Area not found");
    row.dealerIds = Array.from(new Set([...(row.dealerIds || []), req.body.dealerId]));
    await row.save();
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.delete("/masters/areas/:id/dealers/:dealerId", async (req, res, next) => {
  try {
    const row = await Area.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!row) throw new AppError(404, "NOT_FOUND", "Area not found");
    row.dealerIds = (row.dealerIds || []).filter((x: string) => x !== req.params.dealerId);
    await row.save();
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.get("/dealers", async (req, res, next) => {
  try { await list(req, res, Storefront, tenantFilter(req)); } catch (e) { next(e); }
});
router.post("/dealers", async (req, res, next) => {
  try {
    const row = await Storefront.create({ ...req.body, tenantId: req.params.tenantId });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/dealers/:dealerId", async (req, res, next) => {
  try { await getOne(req, res, Storefront, { dealerId: req.params.dealerId, ...tenantFilter(req) }); } catch (e) { next(e); }
});
router.patch("/dealers/:dealerId", async (req, res, next) => {
  try { await patchOne(req, res, Storefront, { dealerId: req.params.dealerId, ...tenantFilter(req) }, req.body); } catch (e) { next(e); }
});
router.post("/dealers/:dealerId/panel-access", async (req, res, next) => {
  try {
    const loginId = req.body.userId || `dealer_${req.params.dealerId}`;
    const row = await User.findOneAndUpdate(
      { dealerId: req.params.dealerId, role: "dealer" },
      { $setOnInsert: { userId: loginId, passwordHash: req.body.passwordHash || "CHANGE_ME", displayName: req.body.displayName || loginId, role: "dealer", tenantId: req.params.tenantId, dealerId: req.params.dealerId } },
      { new: true, upsert: true }
    );
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.get("/dealer-applications", async (req, res, next) => { try { await list(req, res, DealerApplication, tenantFilter(req)); } catch (e) { next(e); } });
router.get("/dealer-applications/:id", async (req, res, next) => { try { await getOne(req, res, DealerApplication, { _id: req.params.id, ...tenantFilter(req) }); } catch (e) { next(e); } });
router.post("/dealer-applications/:id/approve", async (req, res, next) => { try { await patchOne(req, res, DealerApplication, { _id: req.params.id, ...tenantFilter(req) }, { status: "approved" }); } catch (e) { next(e); } });
router.post("/dealer-applications/:id/reject", async (req, res, next) => { try { await patchOne(req, res, DealerApplication, { _id: req.params.id, ...tenantFilter(req) }, { status: "rejected" }); } catch (e) { next(e); } });

router.get("/dealers/performance", async (req, res, next) => {
  try {
    const dealers = await Storefront.find(tenantFilter(req)).select("dealerId dealerName");
    const data = await Promise.all(dealers.map(async (d: any) => ({
      dealerId: d.dealerId,
      dealerName: d.dealerName,
      orderCount: await B2BOrder.countDocuments({ tenantId: req.params.tenantId, dealerId: d.dealerId })
    })));
    res.json({ data });
  } catch (e) { next(e); }
});
router.get("/dealers/:dealerId/performance", async (req, res, next) => {
  try {
    const dealerId = req.params.dealerId;
    res.json({ data: { dealerId, orderCount: await B2BOrder.countDocuments({ tenantId: req.params.tenantId, dealerId }) } });
  } catch (e) { next(e); }
});

registerCrud("/crm/leads", CRMLead);
router.post("/crm/leads/:id/push-to-dealer", async (req, res, next) => {
  try {
    const lead = await CRMLead.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!lead) throw new AppError(404, "NOT_FOUND", "Lead not found");
    const row = await Lead.create({ type: "pushed_from_distributor", tenantId: req.params.tenantId, dealerId: lead.dealerId, storefrontId: req.body.storefrontId, source: "distributor", phone: lead.phone, payload: lead.toObject() });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
registerCrud("/crm/activities", Activity);
registerCrud("/crm/visits", Visit);

registerCrud("/b2b-orders", B2BOrder, { codeField: "orderNo" });
router.post("/b2b-orders/:orderNo/confirm", async (req, res, next) => { try { await patchOne(req, res, B2BOrder, { orderNo: req.params.orderNo, ...tenantFilter(req) }, { status: "Confirmed" }); } catch (e) { next(e); } });
router.post("/b2b-orders/:orderNo/status", async (req, res, next) => { try { await patchOne(req, res, B2BOrder, { orderNo: req.params.orderNo, ...tenantFilter(req) }, { status: req.body.status }); } catch (e) { next(e); } });
router.get("/b2b-orders/pending", async (req, res, next) => { try { await list(req, res, B2BOrder, { ...tenantFilter(req), status: { $in: ["Draft","Submitted","Pending"] } }); } catch (e) { next(e); } });
router.patch("/b2b-orders/pending/:orderNo/priority", async (req, res, next) => { try { await patchOne(req, res, B2BOrder, { orderNo: req.params.orderNo, ...tenantFilter(req) }, { priority: req.body.priority }); } catch (e) { next(e); } });

registerCrud("/dispatches", Dispatch, { codeField: "dispatchId" });

registerCrud("/inventory/stock", DistributorStock, { codeField: "sku" });
router.post("/inventory/stock/:sku/adjust", async (req, res, next) => {
  try {
    const row = await DistributorStock.findOneAndUpdate(
      { sku: req.params.sku, ...tenantFilter(req) },
      { $inc: { onHand: Number(req.body.delta || 0) } },
      { new: true }
    );
    if (!row) throw new AppError(404, "NOT_FOUND", "Stock not found");
    res.json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
registerCrud("/inventory/grn", GRN, { codeField: "grnNo" });
router.post("/inventory/grn/:grnNo/verify", async (req, res, next) => { try { await patchOne(req, res, GRN, { grnNo: req.params.grnNo, ...tenantFilter(req) }, { status: "verified" }); } catch (e) { next(e); } });
router.post("/inventory/grn/:grnNo/accept", async (req, res, next) => { try { await patchOne(req, res, GRN, { grnNo: req.params.grnNo, ...tenantFilter(req) }, { status: "accepted" }); } catch (e) { next(e); } });
registerCrud("/inventory/transfers", StockTransfer, { codeField: "transferId" });
router.post("/inventory/transfers/:transferId/ship", async (req, res, next) => { try { await patchOne(req, res, StockTransfer, { transferId: req.params.transferId, ...tenantFilter(req) }, { status: "shipped" }); } catch (e) { next(e); } });
router.post("/inventory/transfers/:transferId/confirm-delivery", async (req, res, next) => { try { await patchOne(req, res, StockTransfer, { transferId: req.params.transferId, ...tenantFilter(req) }, { status: "delivered" }); } catch (e) { next(e); } });

registerCrud("/accounts/invoices", Invoice, { codeField: "invoiceNo" });
router.post("/accounts/invoices/from-order", async (req, res, next) => {
  try {
    const order = await B2BOrder.findOne({ orderNo: req.body.orderNo, ...tenantFilter(req) });
    if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
    const row = await Invoice.create({ tenantId: req.params.tenantId, dealerId: order.dealerId, invoiceNo: `INV-${Date.now()}`, amountPaise: req.body.amountPaise || 0, status: "created" });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
registerCrud("/accounts/payments", PaymentReceipt, { codeField: "receiptNo" });
router.post("/accounts/payments/:receiptNo/verify", async (req, res, next) => { try { await patchOne(req, res, PaymentReceipt, { receiptNo: req.params.receiptNo, ...tenantFilter(req) }, { status: "verified" }); } catch (e) { next(e); } });
router.get("/accounts/dealer-ledger", async (req, res, next) => { try { await list(req, res, AccountEntry, { ...tenantFilter(req), customerId: req.query.dealerId }); } catch (e) { next(e); } });
router.get("/accounts/dealer-ledger/:dealerId/export", async (req, res) => res.json({ data: { message: "ledger export placeholder", dealerId: req.params.dealerId } }));
registerCrud("/accounts/expenses", AccountEntry, { extraFilter: () => ({ type: "expense" }) });

router.get("/cms/catalog-products", async (req, res, next) => { try { await list(req, res, Product, tenantFilter(req)); } catch (e) { next(e); } });
router.patch("/cms/catalog-products/:id", async (req, res, next) => { try { await patchOne(req, res, Product, { _id: req.params.id, ...tenantFilter(req) }, req.body); } catch (e) { next(e); } });
router.get("/cms/website-leads", async (req, res, next) => { try { await list(req, res, Lead, tenantFilter(req)); } catch (e) { next(e); } });
router.get("/cms/website-leads/:id", async (req, res, next) => { try { await getOne(req, res, Lead, { _id: req.params.id, ...tenantFilter(req) }); } catch (e) { next(e); } });
router.patch("/cms/website-leads/:id", async (req, res, next) => { try { await patchOne(req, res, Lead, { _id: req.params.id, ...tenantFilter(req) }, req.body); } catch (e) { next(e); } });
router.get("/cms/contact-messages", async (req, res, next) => { try { await list(req, res, ContactMessage, tenantFilter(req)); } catch (e) { next(e); } });
router.get("/cms/contact-messages/:id", async (req, res, next) => { try { await getOne(req, res, ContactMessage, { _id: req.params.id, ...tenantFilter(req) }); } catch (e) { next(e); } });
router.patch("/cms/contact-messages/:id", async (req, res, next) => { try { await patchOne(req, res, ContactMessage, { _id: req.params.id, ...tenantFilter(req) }, req.body); } catch (e) { next(e); } });

router.get("/reports/summary", async (req, res) => res.json({ data: { report: "summary", tenantId: req.params.tenantId } }));
router.get("/reports/dealers", async (req, res) => res.json({ data: { report: "dealers", tenantId: req.params.tenantId } }));
router.get("/reports/inventory", async (req, res) => res.json({ data: { report: "inventory", tenantId: req.params.tenantId } }));
router.post("/reports/export", async (req, res, next) => {
  try {
    const row = await ReportExportJob.create({ ownerType: "tenant", ownerId: req.params.tenantId, reportKey: req.body.reportKey, format: req.body.format, filters: req.body.filters, status: "queued" });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});
router.get("/reports/export-jobs/:jobId", async (req, res, next) => { try { await getOne(req, res, ReportExportJob, { _id: req.params.jobId, ownerType: "tenant", ownerId: req.params.tenantId }); } catch (e) { next(e); } });

export default router;
