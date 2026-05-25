import Invoice from "../models/Invoice";
import DeliveryChecklist from "../models/DeliveryChecklist";
import GatePass from "../models/GatePass";
import DeliveryConfirmation from "../models/DeliveryConfirmation";

const DEMO_INVOICE_PREFIX = "INV-DEMO-BND-";

type SeedDeliveryDemoResult = {
  invoices: number;
  checklists: number;
  gatePasses: number;
  confirmations: number;
};

/**
 * Demo delivery pipeline for dealer panel (BND → checklist → gate pass → confirmation).
 * Safe to re-run: replaces prior rows keyed by INV-DEMO-BND-* / GP-DEMO-*.
 */
export async function seedDeliveryDemo(
  dealerId: string,
  tenantId: string,
): Promise<SeedDeliveryDemoResult> {
  const invoiceNos = ["INV-DEMO-BND-001", "INV-DEMO-BND-002", "INV-DEMO-BND-003"];

  await DeliveryConfirmation.deleteMany({ dealerId, invoiceNo: { $in: invoiceNos } });
  await GatePass.deleteMany({ dealerId, gatePassNo: /^GP-DEMO-/ });
  await DeliveryChecklist.deleteMany({ dealerId, invoiceNo: { $in: invoiceNos } });
  await Invoice.deleteMany({ dealerId, invoiceNo: { $regex: `^${DEMO_INVOICE_PREFIX}` } });

  const in7days = new Date(Date.now() + 7 * 86400000).toISOString();

  const invoices = [
    {
      invoiceNo: "INV-DEMO-BND-001",
      customerId: "zforcec-demo-001",
      customerName: "Rahul Kumar",
      phone: "9876543210",
      model: "ZForce Pro",
      amountPaise: 28500000,
      status: "created",
      payload: {
        name: "Rahul Kumar",
        model: "ZForce Pro",
        variant: "Lithium",
        colour: "Red",
        chassis: "ZFCH-DEMO-001",
        reason: "Pending delivery checklist",
        expectedDelivery: in7days,
      },
    },
    {
      invoiceNo: "INV-DEMO-BND-002",
      customerId: "zforcec-demo-002",
      customerName: "Priya Singh",
      phone: "9876501234",
      model: "ZForce City",
      amountPaise: 24500000,
      status: "created",
      payload: {
        name: "Priya Singh",
        model: "ZForce City",
        variant: "Standard",
        colour: "White",
        chassis: "ZFCH-DEMO-002",
        reason: "Checklist in progress",
        expectedDelivery: in7days,
      },
    },
    {
      invoiceNo: "INV-DEMO-BND-003",
      customerId: "zforcec-demo-003",
      customerName: "Amit Verma",
      phone: "9123456780",
      model: "ZForce Cargo",
      amountPaise: 32000000,
      status: "created",
      payload: {
        name: "Amit Verma",
        model: "ZForce Cargo",
        variant: "XL",
        colour: "Blue",
        chassis: "ZFCH-DEMO-003",
        reason: "Gate pass issued — confirm delivery",
        expectedDelivery: in7days,
      },
    },
  ];

  for (const inv of invoices) {
    await Invoice.create({ dealerId, tenantId, ...inv });
  }

  await DeliveryChecklist.create({
    dealerId,
    tenantId,
    invoiceNo: "INV-DEMO-BND-002",
    status: "in_progress",
    checks: {
      pdiDone: true,
      batteryInstalled: true,
      accessoriesInstalled: false,
      insuranceDone: false,
      registrationDone: false,
      gpsFitted: false,
      finalPaymentConfirmation: false,
    },
    payload: {
      name: "Priya Singh",
      model: "ZForce City",
      chassis: "ZFCH-DEMO-002",
      customerId: "zforcec-demo-002",
      batteryMake: "Livguard 150Ah",
    },
  });

  await DeliveryChecklist.create({
    dealerId,
    tenantId,
    invoiceNo: "INV-DEMO-BND-003",
    status: "completed",
    checks: {
      pdiDone: true,
      batteryInstalled: true,
      accessoriesInstalled: true,
      insuranceDone: true,
      registrationDone: true,
      gpsFitted: true,
      finalPaymentConfirmation: true,
    },
    payload: {
      name: "Amit Verma",
      model: "ZForce Cargo",
      chassis: "ZFCH-DEMO-003",
      customerId: "zforcec-demo-003",
      batteryMake: "Okaya 150Ah",
      completedAt: new Date().toISOString(),
    },
  });

  await GatePass.create({
    dealerId,
    tenantId,
    gatePassNo: "GP-DEMO-003",
    invoiceNo: "INV-DEMO-BND-003",
    status: "issued",
    payload: {
      name: "Amit Verma",
      model: "ZForce Cargo",
      chassis: "ZFCH-DEMO-003",
      generatedBy: "Dealer Demo",
      gateOut: "Pending",
    },
  });

  await DeliveryConfirmation.create({
    dealerId,
    tenantId,
    invoiceNo: "INV-DEMO-BND-003",
    status: "pending",
    payload: {
      name: "Amit Verma",
      model: "ZForce Cargo",
      chassis: "ZFCH-DEMO-003",
      custId: "zforcec-demo-003",
    },
  });

  return {
    invoices: invoices.length,
    checklists: 2,
    gatePasses: 1,
    confirmations: 1,
  };
}
