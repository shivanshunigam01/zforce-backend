import AccountEntry from "../models/AccountEntry";
import PaymentReceipt from "../models/PaymentReceipt";
import type { Document } from "mongoose";

export function isCashMode(mode: string): boolean {
  return String(mode || "").trim().toLowerCase() === "cash";
}

export function isBankMode(mode: string): boolean {
  const m = String(mode || "").trim().toLowerCase();
  return ["bank transfer", "upi", "cheque", "card", "finance"].includes(m);
}

function toPlain<T>(doc: T | Document): T {
  return typeof (doc as Document).toObject === "function"
    ? ((doc as Document).toObject() as T)
    : (doc as T);
}

function paiseFromBody(body: Record<string, unknown>): number {
  const direct = Number(body.amountPaise);
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
  const amount = Number(body.amount);
  if (Number.isFinite(amount) && amount > 0) return Math.round(amount * 100);
  return 0;
}

/** Credit cash or bank when a payment receipt is recorded. */
export async function createCashBankFromPayment(receipt: unknown): Promise<void> {
  const r = toPlain(receipt as Document) as Record<string, unknown>;
  const amountPaise = Number(r.amountPaise) || 0;
  if (amountPaise <= 0) return;
  const referenceNo = String(r.receiptNo || "").trim();
  if (!referenceNo) return;

  const existing = await AccountEntry.findOne({
    dealerId: r.dealerId,
    type: "cash_bank",
    referenceNo,
    "payload.source": "payment_receipt",
  });
  if (existing) return;

  const mode = String(r.mode || "Cash");
  const bucket = isCashMode(mode) ? "cash" : "bank";
  const effect = bucket === "cash" ? "cash_in" : "bank_in";

  await AccountEntry.create({
    dealerId: r.dealerId,
    tenantId: r.tenantId,
    type: "cash_bank",
    referenceNo,
    customerId: r.customerId,
    customerName: r.customerName,
    quotationId: r.quotationId || r.quoteNo,
    amountPaise,
    direction: "credit",
    accountName: mode,
    payload: {
      source: "payment_receipt",
      bucket,
      effect,
      mode,
      txnType: "collection",
      paymentRef: r.reference,
      description: `Collection from ${r.customerName || "Customer"}`,
    },
  });
}

/** Debit customer ledger when an invoice is raised (outstanding). */
export async function createCustomerLedgerEntryFromInvoice(invoice: unknown): Promise<void> {
  const inv = toPlain(invoice as Document) as Record<string, unknown>;
  const payload =
    inv.payload && typeof inv.payload === "object" ? (inv.payload as Record<string, unknown>) : {};
  const customerId = String(inv.customerId || payload.custId || "").trim();
  const amountPaise = Number(inv.amountPaise) || 0;
  if (!customerId || amountPaise <= 0) return;

  const referenceNo = String(inv.invoiceNo || "").trim();
  if (!referenceNo) return;

  const existing = await AccountEntry.findOne({
    dealerId: inv.dealerId,
    type: "customer_invoice",
    referenceNo,
  });
  if (existing) return;

  await AccountEntry.create({
    dealerId: inv.dealerId,
    tenantId: inv.tenantId,
    type: "customer_invoice",
    referenceNo,
    customerId,
    customerName: inv.customerName || payload.name,
    quotationId: inv.quotationId || payload.quotationId,
    amountPaise,
    direction: "debit",
    accountName: "Invoice",
    payload: { source: "invoice" },
  });
}

/** Record cash deposit to bank — reduces cash in hand, increases bank balance. */
export async function createDepositEntry(
  dealerId: string,
  tenantId: string,
  body: Record<string, unknown>,
) {
  const amountPaise = paiseFromBody(body);
  if (amountPaise <= 0) throw new Error("Deposit amount is required");

  const payload =
    body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : {};
  const bank = String(body.bank || body.accountName || payload.bank || "").trim();
  if (!bank) throw new Error("Bank name is required");

  const referenceNo = String(
    body.referenceNo || body.depositId || payload.depositId || `DEP-${Date.now()}`,
  ).trim();
  const depositedBy = String(body.depositedBy || payload.depositedBy || "Admin");
  const receiptNo = String(body.receiptNo || payload.receiptNo || "");
  const ref = String(body.reference || body.ref || payload.reference || "");

  const deposit = await AccountEntry.create({
    dealerId,
    tenantId,
    type: "deposit",
    referenceNo,
    accountName: bank,
    amountPaise,
    direction: "credit",
    payload: {
      bank,
      depositedBy,
      receiptNo,
      reference: ref,
      effect: "cash_to_bank",
    },
  });

  const depositId = String(deposit._id);

  await AccountEntry.create({
    dealerId,
    tenantId,
    type: "cash_bank",
    referenceNo: `${referenceNo}-CASH`,
    accountName: "Cash",
    amountPaise,
    direction: "debit",
    payload: {
      source: "deposit",
      depositId,
      bucket: "cash",
      effect: "cash_out",
      txnType: "deposit",
      transferEffect: "cash_to_bank",
      bank,
      description: `Cash deposited to ${bank}`,
    },
  });

  await AccountEntry.create({
    dealerId,
    tenantId,
    type: "cash_bank",
    referenceNo: `${referenceNo}-BANK`,
    accountName: bank,
    amountPaise,
    direction: "credit",
    payload: {
      source: "deposit",
      depositId,
      bucket: "bank",
      effect: "bank_in",
      txnType: "deposit",
      transferEffect: "cash_to_bank",
      bank,
      description: `Cash deposited to ${bank}`,
    },
  });

  return deposit;
}

/** Create expense pending HO approval — no cash impact until approved. */
export async function createExpenseEntry(
  dealerId: string,
  tenantId: string,
  body: Record<string, unknown>,
) {
  const amountPaise = paiseFromBody(body);
  if (amountPaise <= 0) throw new Error("Expense amount is required");

  const payload =
    body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : {};
  const expenseId = String(body.expenseId || body.referenceNo || `EXP-${Date.now()}`);
  const head = String(body.category || body.head || payload.head || "General");
  const mode = String(body.mode || payload.mode || "Cash");

  return AccountEntry.create({
    dealerId,
    tenantId,
    type: "expense",
    referenceNo: expenseId,
    accountName: head,
    amountPaise,
    direction: "debit",
    payload: {
      head,
      branch: body.branch || payload.branch,
      paidTo: body.paidTo || body.vendor || payload.paidTo,
      mode,
      approvalStatus: "pending",
      status: "pending",
    },
  });
}

async function createCashBankFromApprovedExpense(expense: Document): Promise<void> {
  const e = toPlain(expense) as Record<string, unknown>;
  const payload =
    e.payload && typeof e.payload === "object" ? (e.payload as Record<string, unknown>) : {};
  const expenseId = String(e._id);

  const existing = await AccountEntry.findOne({
    dealerId: e.dealerId,
    type: "cash_bank",
    "payload.expenseId": expenseId,
    "payload.source": "expense",
  });
  if (existing) return;

  const mode = String(payload.mode || "Cash");
  const bucket = isCashMode(mode) ? "cash" : "bank";
  const effect = bucket === "cash" ? "cash_out" : "bank_out";
  const head = String(payload.head || e.accountName || "Expense");
  const paidTo = String(payload.paidTo || "—");

  await AccountEntry.create({
    dealerId: e.dealerId,
    tenantId: e.tenantId,
    type: "cash_bank",
    referenceNo: String(e.referenceNo || expenseId),
    accountName: mode,
    amountPaise: Number(e.amountPaise) || 0,
    direction: "debit",
    payload: {
      source: "expense",
      expenseId,
      bucket,
      effect,
      txnType: "expense",
      head,
      paidTo,
      mode,
      approvalStatus: "approved",
      description: `${head} — ${paidTo}`,
    },
  });
}

/** Patch expense; debits cash/bank when HO approves. */
export async function patchExpenseEntry(
  dealerId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const row = await AccountEntry.findOne({ _id: id, dealerId, type: "expense" });
  if (!row) return null;

  const prevPayload =
    row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
  const incomingPayload =
    body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : {};

  const statusRaw = String(
    body.status || body.approvalStatus || incomingPayload.status || incomingPayload.approvalStatus || "",
  ).toLowerCase();
  let approvalStatus = String(prevPayload.approvalStatus || "pending").toLowerCase();
  if (statusRaw === "approved" || statusRaw === "approved ho approval") approvalStatus = "approved";
  else if (statusRaw === "rejected") approvalStatus = "rejected";
  else if (statusRaw === "pending" || statusRaw === "pending ho approval") approvalStatus = "pending";

  const payload = {
    ...prevPayload,
    ...incomingPayload,
    approvalStatus,
    status: approvalStatus,
    approvedBy: body.approvedBy || incomingPayload.approvedBy || prevPayload.approvedBy,
  };

  const updated = await AccountEntry.findByIdAndUpdate(
    id,
    { ...body, payload },
    { new: true },
  );
  if (!updated) return null;

  if (approvalStatus === "approved") {
    await createCashBankFromApprovedExpense(updated);
  }

  return updated;
}

export type CashBankTxn = {
  id: string;
  date: string;
  description: string;
  type: "collection" | "deposit" | "expense";
  mode: string;
  amountPaise: number;
  effect: "cash_in" | "cash_out" | "bank_in" | "bank_out" | "cash_to_bank";
  ref: string;
  sortAt: number;
};

export type CashBankSummary = {
  cashInHandPaise: number;
  cashAtBankPaise: number;
  totalPaise: number;
  cashInPaise: number;
  bankInPaise: number;
  cashOutPaise: number;
  bankOutPaise: number;
  cashToBankPaise: number;
  transactions: CashBankTxn[];
};

function txnFromReceipt(r: Record<string, unknown>): CashBankTxn | null {
  const amountPaise = Number(r.amountPaise) || 0;
  if (amountPaise <= 0) return null;
  const mode = String(r.mode || "Cash");
  const effect = isCashMode(mode) ? "cash_in" : "bank_in";
  const createdAt = r.createdAt ? new Date(String(r.createdAt)).getTime() : Date.now();
  return {
    id: String(r.receiptNo || r._id),
    date: new Date(createdAt).toISOString(),
    description: `Collection from ${r.customerName || "Customer"}`,
    type: "collection",
    mode,
    amountPaise,
    effect,
    ref: String(r.reference || r.receiptNo || "—"),
    sortAt: createdAt,
  };
}

function txnFromDeposit(d: Record<string, unknown>): CashBankTxn | null {
  const amountPaise = Number(d.amountPaise) || 0;
  if (amountPaise <= 0) return null;
  const payload =
    d.payload && typeof d.payload === "object" ? (d.payload as Record<string, unknown>) : {};
  const bank = String(payload.bank || d.accountName || "Bank");
  const createdAt = d.createdAt ? new Date(String(d.createdAt)).getTime() : Date.now();
  return {
    id: String(d.referenceNo || d._id),
    date: new Date(createdAt).toISOString(),
    description: `Cash deposited to ${bank}`,
    type: "deposit",
    mode: "Cash → Bank",
    amountPaise,
    effect: "cash_to_bank",
    ref: String(payload.reference || d.referenceNo || "—"),
    sortAt: createdAt,
  };
}

function txnFromExpense(e: Record<string, unknown>): CashBankTxn | null {
  const payload =
    e.payload && typeof e.payload === "object" ? (e.payload as Record<string, unknown>) : {};
  const approval = String(payload.approvalStatus || payload.status || "").toLowerCase();
  if (approval !== "approved") return null;

  const amountPaise = Number(e.amountPaise) || 0;
  if (amountPaise <= 0) return null;
  const mode = String(payload.mode || "Cash");
  const effect = isCashMode(mode) ? "cash_out" : "bank_out";
  const head = String(payload.head || e.accountName || "Expense");
  const paidTo = String(payload.paidTo || "—");
  const createdAt = e.updatedAt
    ? new Date(String(e.updatedAt)).getTime()
    : e.createdAt
      ? new Date(String(e.createdAt)).getTime()
      : Date.now();

  return {
    id: String(e.referenceNo || e._id),
    date: new Date(createdAt).toISOString(),
    description: `${head} — ${paidTo}`,
    type: "expense",
    mode,
    amountPaise,
    effect,
    ref: String(e.referenceNo || e._id),
    sortAt: createdAt,
  };
}

/** Aggregate balances and transaction list from receipts, deposits, and approved expenses. */
export async function buildCashBankSummary(dealerId: string): Promise<CashBankSummary> {
  const [receipts, deposits, expenses] = await Promise.all([
    PaymentReceipt.find({ dealerId }).sort({ createdAt: -1 }).lean(),
    AccountEntry.find({ dealerId, type: "deposit" }).sort({ createdAt: -1 }).lean(),
    AccountEntry.find({ dealerId, type: "expense" }).sort({ updatedAt: -1 }).lean(),
  ]);

  let cashInPaise = 0;
  let bankInPaise = 0;
  let cashOutPaise = 0;
  let bankOutPaise = 0;
  let cashToBankPaise = 0;
  const transactions: CashBankTxn[] = [];

  for (const r of receipts) {
    const txn = txnFromReceipt(r as Record<string, unknown>);
    if (!txn) continue;
    transactions.push(txn);
    if (txn.effect === "cash_in") cashInPaise += txn.amountPaise;
    else if (txn.effect === "bank_in") bankInPaise += txn.amountPaise;
  }

  for (const d of deposits) {
    const txn = txnFromDeposit(d as Record<string, unknown>);
    if (!txn) continue;
    transactions.push(txn);
    cashToBankPaise += txn.amountPaise;
  }

  for (const e of expenses) {
    const txn = txnFromExpense(e as Record<string, unknown>);
    if (!txn) continue;
    transactions.push(txn);
    if (txn.effect === "cash_out") cashOutPaise += txn.amountPaise;
    else if (txn.effect === "bank_out") bankOutPaise += txn.amountPaise;
  }

  transactions.sort((a, b) => b.sortAt - a.sortAt);

  const cashInHandPaise = cashInPaise - cashOutPaise - cashToBankPaise;
  const cashAtBankPaise = bankInPaise + cashToBankPaise - bankOutPaise;

  return {
    cashInHandPaise,
    cashAtBankPaise,
    totalPaise: cashInHandPaise + cashAtBankPaise,
    cashInPaise,
    bankInPaise,
    cashOutPaise,
    bankOutPaise,
    cashToBankPaise,
    transactions,
  };
}
