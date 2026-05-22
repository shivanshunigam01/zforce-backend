import AccountEntry from "../models/AccountEntry";
import type { Document } from "mongoose";

type ReceiptLike = {
  dealerId?: string;
  tenantId?: string;
  receiptNo?: string;
  customerId?: string;
  customerName?: string;
  quotationId?: string;
  quoteNo?: string;
  amountPaise?: number;
  mode?: string;
};

/** Credit customer ledger when a payment receipt is recorded (reduces outstanding). */
export async function createCustomerLedgerEntryFromPayment(
  receipt: ReceiptLike | Document,
): Promise<void> {
  const r = typeof (receipt as Document).toObject === "function"
    ? (receipt as Document).toObject()
    : receipt;
  const customerId = String(r.customerId || "").trim();
  const amountPaise = Number(r.amountPaise) || 0;
  if (!customerId || amountPaise <= 0) return;

  const quoteRef = String(r.quotationId || r.quoteNo || "").trim();
  const referenceNo = String(r.receiptNo || "").trim() || `PAY-${Date.now()}`;

  await AccountEntry.create({
    dealerId: r.dealerId,
    tenantId: r.tenantId,
    type: "customer_payment",
    referenceNo,
    customerId,
    customerName: r.customerName,
    quotationId: quoteRef || undefined,
    amountPaise,
    direction: "credit",
    accountName: r.mode || "Payment",
    payload: { source: "payment_receipt" },
  });
}
