import VehicleInventory from "../models/VehicleInventory";
import SparePartInventory from "../models/SparePartInventory";
import BatteryInventory from "../models/BatteryInventory";

const DEMO_STOCK_PREFIX = "STK-DEMO-";

type SeedInventoryDemoResult = {
  vehicles: number;
  spareParts: number;
  batteries: number;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysAgoDate = (n: number) => daysAgo(n).slice(0, 10);

/**
 * Demo inventory aligned with master presets + delivery demo chassis numbers.
 * Safe to re-run: replaces prior STK-DEMO-* / PRT-DEMO-* / BAT-DEMO-* rows.
 */
export async function seedInventoryDemo(
  dealerId: string,
  tenantId: string,
): Promise<SeedInventoryDemoResult> {
  await VehicleInventory.deleteMany({ dealerId, stockNo: { $regex: `^${DEMO_STOCK_PREFIX}` } });
  await SparePartInventory.deleteMany({ dealerId, partNo: { $regex: /^PRT-DEMO-/ } });
  await BatteryInventory.deleteMany({ dealerId, batteryNo: { $regex: /^BAT-DEMO-/ } });

  const branch = "Patna Main Showroom";
  const yard = "Yard A";

  const vehicles = [
    // Fresh — from product / model list
    {
      stockNo: "STK-DEMO-001",
      chassisNo: "ZFCH-FRESH-001",
      model: "ZForce Elite",
      status: "available",
      payload: {
        variant: "Elite Long Range",
        colour: "Pearl White",
        mfgDate: daysAgoDate(45),
        branch,
        yard,
        source: "purchase_order",
        poNo: "PO-DEMO-001",
      },
    },
    {
      stockNo: "STK-DEMO-002",
      chassisNo: "ZFCH-FRESH-002",
      model: "ZForce Plus",
      status: "available",
      payload: {
        variant: "Plus Premium",
        colour: "Midnight Black",
        mfgDate: daysAgoDate(30),
        branch,
        yard,
        source: "manual",
      },
    },
    {
      stockNo: "STK-DEMO-003",
      chassisNo: "ZFCH-FRESH-003",
      model: "ZForce Standard",
      status: "available",
      payload: {
        variant: "Lead Acid",
        colour: "Racing Red",
        mfgDate: daysAgoDate(12),
        branch,
        yard: "Yard B",
        source: "purchase_order",
        poNo: "PO-DEMO-002",
      },
    },
    {
      stockNo: "STK-DEMO-004",
      chassisNo: "ZFCH-FRESH-004",
      model: "ZForce Premium",
      status: "available",
      payload: {
        variant: "Lithium",
        colour: "Ocean Blue",
        mfgDate: daysAgoDate(5),
        branch,
        yard,
        source: "manual",
      },
    },
    // Reserved — linked to quotation
    {
      stockNo: "STK-DEMO-005",
      chassisNo: "ZFCH-RSV-001",
      model: "ZForce City",
      status: "reserved",
      linkedQuoteId: "QT-DEMO-001",
      payload: {
        variant: "Standard",
        colour: "Pearl White",
        mfgDate: daysAgoDate(20),
        branch,
        yard,
        customerName: "Suresh Mehta",
        quoteNo: "QT-DEMO-001",
        source: "quotation",
      },
    },
    {
      stockNo: "STK-DEMO-006",
      chassisNo: "ZFCH-RSV-002",
      model: "ZForce Cargo",
      status: "reserved",
      linkedQuoteId: "QT-DEMO-002",
      payload: {
        variant: "Cargo Heavy Duty",
        colour: "Forest Green",
        mfgDate: daysAgoDate(18),
        branch,
        yard,
        customerName: "Neha Gupta",
        quoteNo: "QT-DEMO-002",
        source: "quotation",
      },
    },
    // Billed not delivered — matches delivery demo invoices
    {
      stockNo: "STK-DEMO-007",
      chassisNo: "ZFCH-DEMO-001",
      model: "ZForce Pro",
      status: "billed_not_delivered",
      payload: {
        variant: "Lithium",
        colour: "Racing Red",
        mfgDate: daysAgoDate(25),
        branch,
        yard,
        customerName: "Rahul Kumar",
        invoiceNo: "INV-DEMO-BND-001",
        invoiceDate: daysAgo(4),
        source: "invoice",
      },
    },
    {
      stockNo: "STK-DEMO-008",
      chassisNo: "ZFCH-DEMO-002",
      model: "ZForce City",
      status: "billed_not_delivered",
      payload: {
        variant: "Standard",
        colour: "Pearl White",
        mfgDate: daysAgoDate(22),
        branch,
        yard,
        customerName: "Priya Singh",
        invoiceNo: "INV-DEMO-BND-002",
        invoiceDate: daysAgo(3),
        source: "invoice",
      },
    },
    {
      stockNo: "STK-DEMO-009",
      chassisNo: "ZFCH-DEMO-003",
      model: "ZForce Cargo",
      status: "billed_not_delivered",
      payload: {
        variant: "XL",
        colour: "Ocean Blue",
        mfgDate: daysAgoDate(15),
        branch,
        yard,
        customerName: "Amit Verma",
        invoiceNo: "INV-DEMO-BND-003",
        invoiceDate: daysAgo(2),
        source: "invoice",
      },
    },
    // Delivered
    {
      stockNo: "STK-DEMO-010",
      chassisNo: "ZFCH-DLV-001",
      model: "ZForce Elite",
      status: "delivered",
      payload: {
        variant: "Elite Standard",
        colour: "Midnight Black",
        mfgDate: daysAgoDate(60),
        branch,
        customerName: "Vikash Kumar",
        quoteNo: "QT-DEMO-099",
        invoiceNo: "INV-DEMO-DLV-001",
        invoiceDate: daysAgo(14),
        deliveryDate: daysAgo(7),
        source: "delivery",
      },
    },
    {
      stockNo: "STK-DEMO-011",
      chassisNo: "ZFCH-DLV-002",
      model: "ZForce Plus",
      status: "delivered",
      payload: {
        variant: "Plus Premium",
        colour: "Pearl White",
        mfgDate: daysAgoDate(55),
        branch,
        customerName: "Anjali Devi",
        invoiceNo: "INV-DEMO-DLV-002",
        invoiceDate: daysAgo(10),
        deliveryDate: daysAgo(3),
        source: "delivery",
      },
    },
  ];

  for (const v of vehicles) {
    await VehicleInventory.create({ dealerId, tenantId, ...v });
  }

  const spareParts = [
    {
      partNo: "PRT-DEMO-BRK-F",
      description: "Front Brake Pad Set",
      qtyOnHand: 24,
      payload: { name: "Front Brake Pad Set", category: "Brakes", oem: "PRT-BRK-F", minQty: 5, branch, source: "purchase_order", poNo: "PO-DEMO-003" },
    },
    {
      partNo: "PRT-DEMO-LED-HL",
      description: "LED Headlight Assembly",
      qtyOnHand: 8,
      payload: { name: "LED Headlight Assembly", category: "Electrical", oem: "PRT-LED-HL", minQty: 5, branch, source: "manual" },
    },
    {
      partNo: "PRT-DEMO-TYR-10",
      description: "Tyre 3.00-10 (Pair)",
      qtyOnHand: 3,
      payload: { name: "Tyre 3.00-10 (Pair)", category: "Tyres", oem: "PRT-TYR-10", minQty: 5, branch, source: "purchase_order", poNo: "PO-DEMO-003" },
    },
    {
      partNo: "PRT-DEMO-CHG-48",
      description: "48V Fast Charger",
      qtyOnHand: 15,
      payload: { name: "48V Fast Charger", category: "Charger", oem: "PRT-CHG-48", minQty: 5, branch, source: "manual" },
    },
    {
      partNo: "PRT-DEMO-BAT-48",
      description: "48V Lithium Battery Pack (Spare)",
      qtyOnHand: 0,
      payload: { name: "48V Lithium Battery Pack", category: "Battery", oem: "PRT-BAT-48", minQty: 5, branch, source: "purchase_order", poNo: "PO-DEMO-004" },
    },
  ];

  for (const p of spareParts) {
    await SparePartInventory.create({ dealerId, tenantId, ...p });
  }

  const batteries = [
    {
      batteryNo: "BAT-DEMO-48V-150",
      description: "48V 150Ah Lithium",
      qtyOnHand: 12,
      payload: { type: "48V 150Ah Lithium", capacity: "150Ah", voltage: "48V", warranty: "3 Years", minQty: 3, branch, source: "purchase_order", poNo: "PO-DEMO-005" },
    },
    {
      batteryNo: "BAT-DEMO-48V-100",
      description: "48V 100Ah Lead Acid",
      qtyOnHand: 20,
      payload: { type: "48V 100Ah Lead Acid", capacity: "100Ah", voltage: "48V", warranty: "1 Year", minQty: 5, branch, source: "manual" },
    },
    {
      batteryNo: "BAT-DEMO-60V-120",
      description: "60V 120Ah Lithium",
      qtyOnHand: 2,
      payload: { type: "60V 120Ah Lithium", capacity: "120Ah", voltage: "60V", warranty: "3 Years", minQty: 3, branch, source: "purchase_order", poNo: "PO-DEMO-005" },
    },
    {
      batteryNo: "BAT-DEMO-48V-80",
      description: "48V 80Ah Lead Acid",
      qtyOnHand: 0,
      payload: { type: "48V 80Ah Lead Acid", capacity: "80Ah", voltage: "48V", warranty: "1 Year", minQty: 3, branch, source: "manual" },
    },
  ];

  for (const b of batteries) {
    await BatteryInventory.create({ dealerId, tenantId, ...b });
  }

  return { vehicles: vehicles.length, spareParts: spareParts.length, batteries: batteries.length };
}
