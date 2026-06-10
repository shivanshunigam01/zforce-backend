import PaymentReceipt from "../models/PaymentReceipt";
import AccountEntry from "../models/AccountEntry";
import Invoice from "../models/Invoice";
import { createCustomerLedgerEntryFromPayment } from "./customerLedger.service";
import {
  createCashBankFromPayment,
  createCustomerLedgerEntryFromInvoice,
  createDepositEntry,
  createExpenseEntry,
  patchExpenseEntry,
} from "./accounts.service";

const DEMO_RECEIPT_PREFIX = "REC-DEMO-";
const DEMO_DEPOSIT_PREFIX = "DEP-DEMO-";
const DEMO_EXPENSE_PREFIX = "EXP-DEMO-";

export type SeedAccountsDemoResult = {
  receipts: number;
  deposits: number;
  expenses: number;
  ledgerEntries: number;
};

/**
 * Demo cash/bank, customer ledger, deposits, and expenses for dealer panel.
 * Safe to re-run: replaces prior demo rows by reference prefix.
 */
export async function seedAccountsDemo(
  dealerId: string,
  tenantId: string,
): Promise<SeedAccountsDemoResult> {
  await PaymentReceipt.deleteMany({ dealerId, receiptNo: { $regex: `^${DEMO_RECEIPT_PREFIX}` } });
  await AccountEntry.deleteMany({
    dealerId,
    $or: [
      { referenceNo: { $regex: `^${DEMO_DEPOSIT_PREFIX}` } },
      { referenceNo: { $regex: `^${DEMO_EXPENSE_PREFIX}` } },
      { type: "cash_bank", referenceNo: { $regex: `^${DEMO_DEPOSIT_PREFIX}` } },
    ],
  });
  await AccountEntry.deleteMany({ dealerId, type: "expense", referenceNo: { $regex: `^${DEMO_EXPENSE_PREFIX}` } });

  const receipts = [
    {
      receiptNo: "REC-DEMO-001",
      customerId: "zforcec-demo-001",
      customerName: "Rahul Kumar",
      quotationId: "QT-DEMO-001",
      amountPaise: 5000000,
      mode: "Cash",
      reference: "CASH-REF-001",
      receivedBy: "Admin",
      status: "received",
    },
    {
      receiptNo: "REC-DEMO-002",
      customerId: "zforcec-demo-002",
      customerName: "Priya Singh",
      quotationId: "QT-DEMO-002",
      amountPaise: 3000000,
      mode: "UPI",
      reference: "UPI-882910",
      receivedBy: "Admin",
      status: "received",
    },
    {
      receiptNo: "REC-DEMO-003",
      customerId: "zforcec-demo-003",
      customerName: "Amit Verma",
      quotationId: "QT-DEMO-003",
      amountPaise: 7500000,
      mode: "Bank Transfer",
      reference: "NEFT-445566",
      receivedBy: "Admin",
      status: "received",
    },
  ];

  for (const r of receipts) {
    const row = await PaymentReceipt.create({ ...r, dealerId, tenantId });
    await createCustomerLedgerEntryFromPayment(row);
    await createCashBankFromPayment(row);
  }

  await createDepositEntry(dealerId, tenantId, {
    referenceNo: "DEP-DEMO-001",
    amountPaise: 2000000,
    bank: "HDFC Patna",
    depositedBy: "Admin",
    receiptNo: "REC-DEMO-001",
    reference: "CHQ-7788",
  });

  const pendingExpense = await createExpenseEntry(dealerId, tenantId, {
    referenceNo: "EXP-DEMO-001",
    amountPaise: 450000,
    head: "Fuel",
    branch: "Patna HQ",
    paidTo: "Indian Oil Pump",
    mode: "Cash",
  });
  await patchExpenseEntry(dealerId, String(pendingExpense._id), {
    approvalStatus: "approved",
    approvedBy: "HO Admin",
  });

  await createExpenseEntry(dealerId, tenantId, {
    referenceNo: "EXP-DEMO-002",
    amountPaise: 1200000,
    head: "Rent",
    branch: "Patna HQ",
    paidTo: "City Mall Properties",
    mode: "Bank Transfer",
    payload: { approvalStatus: "pending", status: "pending" },
  });

  const demoInvoices = await Invoice.find({
    dealerId,
    invoiceNo: { $regex: /^INV-DEMO-/ },
  }).lean();

  for (const inv of demoInvoices) {
    await createCustomerLedgerEntryFromInvoice(inv);
  }

  const ledgerEntries = await AccountEntry.countDocuments({ dealerId });

  return {
    receipts: receipts.length,
    deposits: 1,
    expenses: 2,
    ledgerEntries,
  };
}
