import CibilDraft from "../models/CibilDraft";
import CibilRequest from "../models/CibilRequest";
import RazorpayEvent from "../models/RazorpayEvent";
import { env } from "../config/env";
import { encryptSensitive, decryptSensitive } from "../utils/crypto";
import { AppError } from "../utils/errors";
import { razorpay, verifyRazorpayPaymentSignature } from "./razorpay.service";
import {
  fetchExperianJsonReport,
  isSurepassConfigured
} from "./surepass.service";

export async function createCibilOrder(storefront: any, payload: any) {
  const order = await razorpay.orders.create({
    amount: env.cibilFeePaise,
    currency: "INR",
    receipt: `cibil_${Date.now()}`
  });

  const draft = await CibilDraft.create({
    storefrontId: storefront._id,
    tenantId: storefront.tenantId,
    dealerId: storefront.dealerId,
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    panEncrypted: encryptSensitive(payload.pan),
    consent: payload.consent,
    paymentStatus: "created",
    razorpayOrderId: order.id,
    amountPaise: env.cibilFeePaise,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000)
  });

  return {
    orderId: order.id,
    amountPaise: env.cibilFeePaise,
    currency: "INR",
    keyId: env.razorpayKeyId,
    prefill: {
      name: payload.name,
      email: payload.email,
      contact: payload.phone
    },
    cibilDraftId: String(draft._id)
  };
}

/**
 * After Razorpay is verified, pull Experian JSON via Surepass and persist on the request.
 */
export async function attachSurepassReportToRequest(requestId: string, draft: any): Promise<void> {
  if (!isSurepassConfigured()) {
    await CibilRequest.updateOne(
      { _id: requestId },
      { surepassStatus: "skipped", surepassError: "SUREPASS_TOKEN not set" }
    );
    return;
  }

  let pan: string;
  try {
    pan = decryptSensitive(draft.panEncrypted);
  } catch (e) {
    await CibilRequest.updateOne(
      { _id: requestId },
      { surepassStatus: "failed", surepassError: "PAN decrypt failed" }
    );
    return;
  }

  const sp = await fetchExperianJsonReport({
    name: draft.name,
    mobile: draft.phone,
    pan
  });

  if (!sp.ok) {
    await CibilRequest.updateOne(
      { _id: requestId },
      {
        surepassStatus: "failed",
        surepassError: sp.message,
        status: "pending_review"
      }
    );
    return;
  }

  await CibilRequest.updateOne(
    { _id: requestId },
    {
      $set: {
        surepassStatus: "success",
        creditScore: sp.creditScore ?? undefined,
        reportNumber: sp.reportNumber ?? undefined,
        reportDate: sp.reportDate ?? undefined,
        reportTime: sp.reportTime ?? undefined,
        surepassRaw: sp.data,
        status: "pending_review"
      },
      $unset: { surepassError: "" }
    }
  );
}

export async function confirmCibilPayment(input: any) {
  const draft = await CibilDraft.findById(input.cibilDraftId);
  if (!draft) throw new AppError(404, "DRAFT_NOT_FOUND", "CIBIL draft not found");
  if (draft.paymentStatus === "paid" && draft.razorpayPaymentId === input.razorpay_payment_id) {
    const existing = await CibilRequest.findOne({ razorpayPaymentId: input.razorpay_payment_id });
    return existing;
  }

  const isValid = verifyRazorpayPaymentSignature(
    input.razorpay_order_id,
    input.razorpay_payment_id,
    input.razorpay_signature
  );
  if (!isValid) throw new AppError(400, "INVALID_PAYMENT_SIGNATURE", "Razorpay signature verification failed");

  const duplicate = await CibilRequest.findOne({ razorpayPaymentId: input.razorpay_payment_id });
  if (duplicate) throw new AppError(409, "DUPLICATE_PAYMENT", "This payment has already been processed");

  draft.paymentStatus = "paid";
  draft.razorpayPaymentId = input.razorpay_payment_id;
  draft.paidAt = new Date();
  await draft.save();

  const request = await CibilRequest.create({
    storefrontId: draft.storefrontId,
    tenantId: draft.tenantId,
    dealerId: draft.dealerId,
    draftId: draft._id,
    name: draft.name,
    phone: draft.phone,
    email: draft.email,
    panEncrypted: draft.panEncrypted,
    razorpayOrderId: draft.razorpayOrderId,
    razorpayPaymentId: input.razorpay_payment_id,
    amountPaise: draft.amountPaise,
    status: "pending_review",
    paidAt: draft.paidAt
  });

  await attachSurepassReportToRequest(String(request._id), draft);
  return CibilRequest.findById(request._id);
}

export async function submitCibilFromPaidDraft(input: any) {
  const draft = await CibilDraft.findById(input.cibilDraftId);
  if (!draft) throw new AppError(404, "DRAFT_NOT_FOUND", "CIBIL draft not found");
  if (draft.paymentStatus !== "paid" || !draft.razorpayPaymentId) {
    throw new AppError(400, "PAYMENT_PENDING", "CIBIL payment is not completed yet");
  }

  const existing = await CibilRequest.findOne({ draftId: draft._id });
  if (existing) return existing;

  const duplicatePayment = await CibilRequest.findOne({ razorpayPaymentId: draft.razorpayPaymentId });
  if (duplicatePayment) throw new AppError(409, "DUPLICATE_PAYMENT", "This payment has already been processed");

  const request = await CibilRequest.create({
    storefrontId: draft.storefrontId,
    tenantId: draft.tenantId,
    dealerId: draft.dealerId,
    draftId: draft._id,
    name: draft.name,
    phone: draft.phone,
    email: draft.email,
    panEncrypted: draft.panEncrypted,
    razorpayOrderId: draft.razorpayOrderId,
    razorpayPaymentId: draft.razorpayPaymentId,
    amountPaise: draft.amountPaise,
    status: "pending_review",
    paidAt: draft.paidAt || new Date()
  });

  await attachSurepassReportToRequest(String(request._id), draft);
  return CibilRequest.findById(request._id);
}

export async function processWebhookEvent(eventBody: any) {
  const eventId = eventBody?.payload?.payment?.entity?.id || eventBody?.created_at?.toString() || `evt_${Date.now()}`;
  const orderId = eventBody?.payload?.payment?.entity?.order_id;
  const paymentId = eventBody?.payload?.payment?.entity?.id;
  const exists = await RazorpayEvent.findOne({ paymentId, eventType: eventBody.event });
  if (exists) return { skipped: true };

  await RazorpayEvent.create({
    eventId,
    eventType: eventBody.event,
    paymentId,
    orderId,
    payload: eventBody,
    processedAt: new Date()
  });

  if (eventBody.event === "payment.captured" && orderId && paymentId) {
    const draft = await CibilDraft.findOne({ razorpayOrderId: orderId });
    if (draft && draft.paymentStatus !== "paid") {
      const duplicate = await CibilRequest.findOne({ razorpayPaymentId: paymentId });
      if (!duplicate) {
        draft.paymentStatus = "paid";
        draft.razorpayPaymentId = paymentId;
        draft.paidAt = new Date();
        await draft.save();

        const request = await CibilRequest.create({
          storefrontId: draft.storefrontId,
          tenantId: draft.tenantId,
          dealerId: draft.dealerId,
          draftId: draft._id,
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          panEncrypted: draft.panEncrypted,
          razorpayOrderId: draft.razorpayOrderId,
          razorpayPaymentId: paymentId,
          amountPaise: draft.amountPaise,
          status: "pending_review",
          paidAt: draft.paidAt
        });
        void attachSurepassReportToRequest(String(request._id), draft).catch((err) => {
          console.error("[CIBIL] Surepass attach failed (webhook)", err);
        });
      }
    }
  }

  return { ok: true };
}
