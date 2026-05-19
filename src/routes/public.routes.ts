// @ts-nocheck
import { Router } from "express";
import { authJwt } from "../middleware/authJwt";
import { resolveStorefront } from "../middleware/resolveStorefront";
import { cibilRateLimit, publicFormsRateLimit } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import { cibilConfirmSchema, cibilExperianPdfSchema, cibilFormSchema, cibilOrderSchema, contactSchema, dealerApplicationSchema, enquirySchema, financeSchema, jobApplicationSchema } from "../validators/public.validators";
import { createCibilOrder, confirmCibilPayment, submitCibilFromPaidDraft } from "../services/cibil.service";
import { fetchExperianPdfLink } from "../services/surepass.service";
import CibilDraft from "../models/CibilDraft";
import Product from "../models/Product";
import GalleryItem from "../models/GalleryItem";
import Lead from "../models/Lead";
import FinanceApplication from "../models/FinanceApplication";
import ContactMessage from "../models/ContactMessage";
import DealerApplication from "../models/DealerApplication";
import JobPosting from "../models/JobPosting";
import JobApplication from "../models/JobApplication";
import Storefront from "../models/Storefront";
import { getPagination } from "../utils/pagination";
import { paginated, toJSON } from "../utils/api";
import { AppError } from "../utils/errors";
import CibilRequest from "../models/CibilRequest";
import { maskPan, decryptSensitive } from "../utils/crypto";
import { stripCibilRequestForPublic } from "../utils/cibilPublic";
import { publicCibilConfigView, resolveCibilPaymentConfig } from "../services/cibilPaymentConfig.service";
import path from "path";
import fs from "fs";

const router = Router();
router.use(resolveStorefront);

router.get("/bootstrap", async (req, res, next) => {
  try {
    const sf = req.storefront!;
    res.json({
      data: {
        storefront: {
          slug: sf.slug,
          dealerName: sf.dealerName,
          dealerId: sf.dealerId
        },
        site: sf.siteSettings || {},
        nav: sf.nav || {},
        footer: sf.footer || {},
        homePage: {
          sectionsOrder: sf.homepageLayout?.sectionsOrder || ["hero", "productHighlight", "features", "offers", "emi", "why", "testimonials", "enquiry"],
          ...sf.homeSections
        },
        floatingCta: sf.floatingCta || {}
      }
    });
  } catch (e) { next(e); }
});

router.get("/navigation", async (req, res) => res.json({ data: req.storefront!.nav || {} }));
router.get("/footer", async (req, res) => res.json({ data: req.storefront!.footer || {} }));
router.get("/floating-cta", async (req, res) => res.json({ data: req.storefront!.floatingCta || {} }));
router.get("/site-settings", async (req, res) => res.json({ data: req.storefront!.siteSettings || {} }));
router.get("/i18n", async (req, res) => {
  const locale = typeof req.query.locale === "string" ? req.query.locale : "en";
  const dict = req.storefront!.i18n?.[locale] || req.storefront!.i18n?.en || {};
  res.json({ data: { locale, strings: dict } });
});
router.get("/home/hero", async (req, res) => res.json({ data: req.storefront!.homeSections?.hero || { slides: [] } }));
router.get("/home/product-highlight", async (req, res) => res.json({ data: req.storefront!.homeSections?.productHighlight || {} }));
router.get("/home/features", async (req, res) => res.json({ data: req.storefront!.homeSections?.features || {} }));
router.get("/home/offers", async (req, res) => res.json({ data: req.storefront!.homeSections?.offers || {} }));
router.get("/home/emi", async (req, res) => res.json({ data: req.storefront!.homeSections?.emi || {} }));
router.get("/home/why-zforce", async (req, res) => res.json({ data: req.storefront!.homeSections?.whyZforce || {} }));
router.get("/home/testimonials", async (req, res) => res.json({ data: req.storefront!.homeSections?.testimonials || {} }));

router.get("/pages/products", async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter: any = { storefrontId: req.storefront!._id, isActive: true, deletedAt: null };
    if (typeof req.query.category === "string") filter.category = req.query.category;
    const [rows, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);
    res.json(paginated(page, limit, total, rows.map(toJSON)));
  } catch (e) { next(e); }
});

router.get("/pages/products/:slug/brochure", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) throw new AppError(400, "BAD_REQUEST", "Missing slug");
    const product = await Product.findOne({
      storefrontId: req.storefront!._id,
      slug,
      isActive: true,
      deletedAt: null
    });
    const bf = product?.brochureFile as { storedName?: string; originalName?: string; mimeType?: string } | undefined;
    if (!bf?.storedName) throw new AppError(404, "NOT_FOUND", "Brochure not available for this product");
    const filePath = path.join(process.cwd(), "uploads", "product-brochures", bf.storedName);
    if (!fs.existsSync(filePath)) throw new AppError(404, "NOT_FOUND", "Brochure file missing on server");
    const ext = path.extname(bf.storedName).toLowerCase() === ".zip" ? ".zip" : ".pdf";
    res.setHeader("Content-Type", bf.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="zforce-${slug}${ext}"`);
    res.sendFile(path.resolve(filePath));
  } catch (e) { next(e); }
});

router.get("/pages/products/:slugOrId", async (req, res, next) => {
  try {
    const filter = {
      storefrontId: req.storefront!._id,
      $or: [{ slug: req.params.slugOrId }, { _id: req.params.slugOrId }]
    } as any;
    const product = await Product.findOne(filter);
    if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");
    res.json({ data: toJSON(product) });
  } catch (e) { next(e); }
});

router.get("/pages/gallery", async (req, res, next) => {
  try {
    const rows = await GalleryItem.find({ storefrontId: req.storefront!._id, isActive: true, deletedAt: null }).sort({ sortOrder: 1 });
    res.json({ data: rows.map(toJSON) });
  } catch (e) { next(e); }
});

["finance","cibil","about","contact","become-dealer"].forEach((key) => {
  router.get(`/pages/${key}`, async (req, res) => {
    res.json({ data: req.storefront!.pageContent?.[key] || {} });
  });
});

router.get("/pages/career", async (req, res, next) => {
  try {
    const rows = await JobPosting.find({ storefrontId: req.storefront!._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ data: rows.map(toJSON) });
  } catch (e) { next(e); }
});

router.get("/pages/dealer-locator", async (req, res, next) => {
  try {
    const current = req.storefront!;
    const network = await Storefront.find({ tenantId: current.tenantId, isActive: true }).select("dealerName slug siteSettings");
    const markers = network.map((item: any) => ({
      dealerId: item.dealerId,
      name: item.dealerName,
      slug: item.slug,
      address: item.siteSettings?.address,
      phone: item.siteSettings?.phone,
      lat: undefined,
      lng: undefined
    }));
    res.json({ data: { center: { lat: 0, lng: 0 }, zoom: 5, markers } });
  } catch (e) { next(e); }
});

router.post("/forms/enquiry", publicFormsRateLimit, validate(enquirySchema), async (req, res, next) => {
  try {
    const row = await Lead.create({
      type: "enquiry",
      storefrontId: req.storefront!._id,
      tenantId: req.storefront!.tenantId,
      dealerId: req.storefront!.dealerId,
      ...req.body
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.post("/forms/product-enquiry", publicFormsRateLimit, validate(enquirySchema), async (req, res, next) => {
  try {
    const row = await Lead.create({
      type: "product_enquiry",
      storefrontId: req.storefront!._id,
      tenantId: req.storefront!.tenantId,
      dealerId: req.storefront!.dealerId,
      ...req.body
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.post("/forms/locator-search", publicFormsRateLimit, validate(enquirySchema), async (req, res, next) => {
  try {
    const row = await Lead.create({
      type: "locator_search",
      storefrontId: req.storefront!._id,
      tenantId: req.storefront!.tenantId,
      dealerId: req.storefront!.dealerId,
      ...req.body
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.post("/forms/finance-application", publicFormsRateLimit, validate(financeSchema), async (req, res, next) => {
  try {
    const row = await FinanceApplication.create({
      storefrontId: req.storefront!._id,
      tenantId: req.storefront!.tenantId,
      dealerId: req.storefront!.dealerId,
      ...req.body,
      status: "new"
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.post("/forms/contact", publicFormsRateLimit, validate(contactSchema), async (req, res, next) => {
  try {
    const row = await ContactMessage.create({
      storefrontId: req.storefront!._id,
      tenantId: req.storefront!.tenantId,
      dealerId: req.storefront!.dealerId,
      ...req.body
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.post("/forms/become-dealer", publicFormsRateLimit, validate(dealerApplicationSchema), async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const extra = (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
    const row = await DealerApplication.create({
      storefrontId: req.storefront!._id,
      tenantId: req.storefront!.tenantId,
      dealerId: req.storefront!.dealerId,
      status: "new",
      companyName: body.companyName,
      ownerName: body.ownerName,
      phone: body.phone,
      email: body.email,
      district: body.district,
      payload: {
        ...extra,
        source: "become-dealer",
        formPath: "/become-dealer",
        name: body.ownerName,
        businessName: body.companyName,
      },
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.post("/forms/job-application", publicFormsRateLimit, validate(jobApplicationSchema), async (req, res, next) => {
  try {
    const row = await JobApplication.create({
      storefrontId: req.storefront!._id,
      tenantId: req.storefront!.tenantId,
      dealerId: req.storefront!.dealerId,
      ...req.body
    });
    res.status(201).json({ data: toJSON(row) });
  } catch (e) { next(e); }
});

router.post("/forms/cibil", cibilRateLimit, validate(cibilFormSchema), async (req, res, next) => {
  try {
    const request = await submitCibilFromPaidDraft(req.body);
    res.status(201).json({ data: { ...stripCibilRequestForPublic(request), panMasked: maskPan(undefined) } });
  } catch (e) { next(e); }
});

router.get("/cibil/config", async (req, res) => {
  res.json({ data: publicCibilConfigView(req.storefront!) });
});

router.post("/cibil/payment-order", cibilRateLimit, validate(cibilOrderSchema), async (req, res, next) => {
  try {
    const data = await createCibilOrder(req.storefront, req.body);
    res.status(201).json({ data });
  } catch (e) { next(e); }
});

router.post("/cibil/confirm-payment", cibilRateLimit, validate(cibilConfirmSchema), async (req, res, next) => {
  try {
    const request = await confirmCibilPayment(req.body);
    res.json({ data: { ...stripCibilRequestForPublic(request), panMasked: maskPan(undefined) } });
  } catch (e) { next(e); }
});

/** After payment: fetch Experian PDF link via Surepass (same storefront + payment id). */
router.post("/cibil/experian-pdf", cibilRateLimit, validate(cibilExperianPdfSchema), async (req, res, next) => {
  try {
    const row = await CibilRequest.findOne({
      _id: req.body.cibilRequestId,
      storefrontId: req.storefront!._id,
      razorpayPaymentId: req.body.razorpay_payment_id
    });
    if (!row) throw new AppError(404, "NOT_FOUND", "CIBIL request not found for this storefront");
    const draft = await CibilDraft.findById(row.draftId);
    if (!draft) throw new AppError(404, "NOT_FOUND", "Draft not found");

    let pan: string;
    try {
      pan = decryptSensitive(draft.panEncrypted);
    } catch {
      throw new AppError(500, "DECRYPT_FAILED", "Could not read PAN for PDF request");
    }

    const cfg = resolveCibilPaymentConfig(req.storefront!);
    const pdf = await fetchExperianPdfLink(
      {
        name: row.name || draft.name,
        mobile: row.phone || draft.phone,
        pan
      },
      { baseUrl: cfg.surepassBaseUrl, token: cfg.surepassToken }
    );
    if (!pdf.ok) {
      throw new AppError(pdf.status >= 400 && pdf.status < 600 ? pdf.status : 502, "SUREPASS_PDF", pdf.message);
    }

    await CibilRequest.updateOne({ _id: row._id }, { creditReportPdfUrl: pdf.creditReportLink });
    res.json({ data: { creditReportLink: pdf.creditReportLink } });
  } catch (e) { next(e); }
});

router.get("/seo", async (req, res) => {
  const path = typeof req.query.path === "string" ? req.query.path : "/";
  res.json({ data: req.storefront!.seo?.[path] || {} });
});

export default router;
