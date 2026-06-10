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

const DEFAULT_BATTERY = "EASTMAN 140AH 15 MONTHS 48V";
const DEFAULT_CHARGER = "EASTMAN 18AMP";

/**
 * Demo inventory from Z Force quotation catalog (Alpha SS/MS, MAX, Slipper SS).
 * Safe to re-run: replaces prior STK-DEMO-* / PRT-DEMO-* / BAT-DEMO-* rows.
 */
export async function seedInventoryDemo(
  dealerId: string,
  tenantId: string,
): Promise<SeedInventoryDemoResult> {
  await VehicleInventory.deleteMany({ dealerId, stockNo: { $regex: `^${DEMO_STOCK_PREFIX}` } });
  await SparePartInventory.deleteMany({ dealerId, partNo: { $regex: /^PRT-DEMO-/ } });
  await BatteryInventory.deleteMany({ dealerId, batteryNo: { $regex: /^BAT-DEMO-|^BAT-EASTMAN-|^BAT-LIVGUARD-|^BAT-60V-/ } });

  const branch = "Patna Main Showroom";
  const yard = "Yard A";

  const vehicles = [
    // Available — Z Force quotation models
    {
      stockNo: "STK-DEMO-001",
      chassisNo: "ZFCH-ALPHA-SS-001",
      model: "Z Force Alpha (SS)",
      status: "available",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Solid Colors",
        mfgDate: daysAgoDate(40),
        branch,
        yard,
        batteryType: DEFAULT_BATTERY,
        charger: DEFAULT_CHARGER,
        motor: "1200W/1300W",
        source: "purchase_order",
        poNo: "PO-ZF-ALPHA-SS",
      },
    },
    {
      stockNo: "STK-DEMO-002",
      chassisNo: "ZFCH-ALPHA-SS-002",
      model: "Z Force Alpha (SS)",
      status: "available",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Solid Colors",
        mfgDate: daysAgoDate(28),
        branch,
        yard,
        batteryType: DEFAULT_BATTERY,
        charger: DEFAULT_CHARGER,
        source: "purchase_order",
        poNo: "PO-ZF-ALPHA-SS",
      },
    },
    {
      stockNo: "STK-DEMO-003",
      chassisNo: "ZFCH-ALPHA-SS-003",
      model: "Z Force Alpha (SS)",
      status: "available",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Solid Colors",
        mfgDate: daysAgoDate(14),
        branch,
        yard: "Yard B",
        batteryType: DEFAULT_BATTERY,
        source: "manual",
      },
    },
    {
      stockNo: "STK-DEMO-004",
      chassisNo: "ZFCH-MAX-001",
      model: "Z Force (MAX)",
      status: "available",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "ED 13 Layer Paint",
        mfgDate: daysAgoDate(35),
        branch,
        yard,
        batteryType: DEFAULT_BATTERY,
        listPrice: 127000,
        source: "purchase_order",
        poNo: "PO-ZF-MAX",
      },
    },
    {
      stockNo: "STK-DEMO-005",
      chassisNo: "ZFCH-MAX-002",
      model: "Z Force (MAX)",
      status: "available",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "ED 13 Layer Paint",
        mfgDate: daysAgoDate(10),
        branch,
        yard,
        batteryType: DEFAULT_BATTERY,
        listPrice: 127000,
        source: "purchase_order",
        poNo: "PO-ZF-MAX",
      },
    },
    {
      stockNo: "STK-DEMO-006",
      chassisNo: "ZFCH-ALPHA-MS-001",
      model: "Z Force Alpha (MS)",
      status: "available",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Metallic Liquid Paint",
        mfgDate: daysAgoDate(22),
        branch,
        yard,
        batteryType: DEFAULT_BATTERY,
        source: "purchase_order",
        poNo: "PO-ZF-ALPHA-MS",
      },
    },
    {
      stockNo: "STK-DEMO-007",
      chassisNo: "ZFCH-ALPHA-MS-002",
      model: "Z Force Alpha (MS)",
      status: "available",
      payload: {
        variant: "LIVGUARD 140AH 15MONTHS",
        colour: "Metallic Liquid Paint",
        mfgDate: daysAgoDate(8),
        branch,
        yard,
        batteryType: "LIVGUARD 140AH 15MONTHS",
        source: "manual",
      },
    },
    {
      stockNo: "STK-DEMO-008",
      chassisNo: "ZFCH-SLIPPER-SS-001",
      model: "Z Force Alpha Slipper (SS)",
      status: "available",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Metallic Liquid Paint",
        mfgDate: daysAgoDate(18),
        branch,
        yard,
        batteryType: DEFAULT_BATTERY,
        source: "purchase_order",
        poNo: "PO-ZF-SLIPPER",
      },
    },
    {
      stockNo: "STK-DEMO-009",
      chassisNo: "ZFCH-SLIPPER-SS-002",
      model: "Z Force Alpha Slipper (SS)",
      status: "available",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Metallic Liquid Paint",
        mfgDate: daysAgoDate(6),
        branch,
        yard,
        batteryType: DEFAULT_BATTERY,
        source: "manual",
      },
    },
    // Reserved — booking from quotation
    {
      stockNo: "STK-DEMO-010",
      chassisNo: "ZFCH-RSV-001",
      model: "Z Force Alpha (SS)",
      status: "reserved",
      linkedQuoteId: "QT-DEMO-001",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Solid Colors",
        mfgDate: daysAgoDate(20),
        branch,
        yard,
        customerName: "Suresh Mehta",
        quoteNo: "QT-DEMO-001",
        batteryType: DEFAULT_BATTERY,
        source: "quotation",
      },
    },
    // Billed not delivered — linked to delivery demo invoices
    {
      stockNo: "STK-DEMO-011",
      chassisNo: "ZFCH-DEMO-001",
      model: "Z Force Alpha (SS)",
      status: "billed_not_delivered",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Solid Colors",
        mfgDate: daysAgoDate(25),
        branch,
        yard,
        customerName: "Rahul Kumar",
        invoiceNo: "INV-DEMO-BND-001",
        invoiceDate: daysAgo(4),
        batteryType: DEFAULT_BATTERY,
        stockDeducted: true,
        source: "invoice",
      },
    },
    {
      stockNo: "STK-DEMO-012",
      chassisNo: "ZFCH-DEMO-002",
      model: "Z Force (MAX)",
      status: "billed_not_delivered",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "ED 13 Layer Paint",
        mfgDate: daysAgoDate(22),
        branch,
        yard,
        customerName: "Priya Singh",
        invoiceNo: "INV-DEMO-BND-002",
        invoiceDate: daysAgo(3),
        batteryType: DEFAULT_BATTERY,
        stockDeducted: true,
        source: "invoice",
      },
    },
    {
      stockNo: "STK-DEMO-013",
      chassisNo: "ZFCH-DEMO-003",
      model: "Z Force Alpha Slipper (SS)",
      status: "billed_not_delivered",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "Metallic Liquid Paint",
        mfgDate: daysAgoDate(15),
        branch,
        yard,
        customerName: "Amit Verma",
        invoiceNo: "INV-DEMO-BND-003",
        invoiceDate: daysAgo(2),
        batteryType: DEFAULT_BATTERY,
        stockDeducted: true,
        source: "invoice",
      },
    },
    // Delivered
    {
      stockNo: "STK-DEMO-014",
      chassisNo: "ZFCH-DLV-001",
      model: "Z Force (MAX)",
      status: "delivered",
      payload: {
        variant: DEFAULT_BATTERY,
        colour: "ED 13 Layer Paint",
        mfgDate: daysAgoDate(60),
        branch,
        customerName: "Vikash Kumar",
        quoteNo: "QT-DEMO-099",
        invoiceNo: "INV-DEMO-DLV-001",
        invoiceDate: daysAgo(14),
        deliveryDate: daysAgo(7),
        batteryType: DEFAULT_BATTERY,
        stockDeducted: true,
        source: "delivery",
      },
    },
    {
      stockNo: "STK-DEMO-015",
      chassisNo: "ZFCH-DLV-002",
      model: "Z Force Alpha (MS)",
      status: "delivered",
      payload: {
        variant: "LIVGUARD 130AH 12MONTHS",
        colour: "Metallic Liquid Paint",
        mfgDate: daysAgoDate(55),
        branch,
        customerName: "Anjali Devi",
        invoiceNo: "INV-DEMO-DLV-002",
        invoiceDate: daysAgo(10),
        deliveryDate: daysAgo(3),
        batteryType: "LIVGUARD 130AH 12MONTHS",
        stockDeducted: true,
        source: "delivery",
      },
    },
  ];

  for (const v of vehicles) {
    await VehicleInventory.create({ dealerId, tenantId, ...v });
  }

  const spareParts = [
    {
      partNo: "PRT-DEMO-CHG-EASTMAN-18",
      description: "Charger EASTMAN 18AMP",
      qtyOnHand: 28,
      payload: { name: "Charger EASTMAN 18AMP", category: "Charger", oem: "CHG-EASTMAN-18", minQty: 5, branch, warranty: "1 Year", source: "purchase_order", poNo: "PO-ZF-PARTS" },
    },
    {
      partNo: "PRT-DEMO-MOTOR-1200W",
      description: "Motor 1200W/1300W",
      qtyOnHand: 12,
      payload: { name: "Motor 1200W/1300W", category: "Motor", oem: "MTR-1200W", minQty: 3, branch, warranty: "1 Year", source: "purchase_order", poNo: "PO-ZF-PARTS" },
    },
    {
      partNo: "PRT-DEMO-CTRL-55AMP",
      description: "Controller 55/60 AMP",
      qtyOnHand: 14,
      payload: { name: "Controller 55/60 AMP", category: "Controller", oem: "CTRL-55AMP", minQty: 3, branch, warranty: "1 Year", source: "purchase_order", poNo: "PO-ZF-PARTS" },
    },
    {
      partNo: "PRT-DEMO-TYR-375X12",
      description: "Tyre 3.75X12 TVS / JK / CEAT",
      qtyOnHand: 40,
      payload: { name: "Tyre 3.75X12 TVS / JK / CEAT", category: "Tyres", oem: "TYR-375X12", minQty: 8, branch, source: "purchase_order", poNo: "PO-ZF-PARTS" },
    },
    {
      partNo: "PRT-DEMO-RIM-SHEET",
      description: "Sheet Metal Rim",
      qtyOnHand: 32,
      payload: { name: "Sheet Metal Rim", category: "Rims", oem: "RIM-SHEET", minQty: 8, branch, source: "purchase_order", poNo: "PO-ZF-PARTS" },
    },
    {
      partNo: "PRT-DEMO-ALLOY-RIM-4PC",
      description: "Alloy Rims (4 PC)",
      qtyOnHand: 10,
      payload: { name: "Alloy Rims (4 PC)", category: "Rims", oem: "RIM-ALLOY-4", minQty: 4, branch, addonPrice: 2100, source: "manual" },
    },
    {
      partNo: "PRT-DEMO-DIFF-33IN",
      description: "Differential 33 Inch",
      qtyOnHand: 9,
      payload: { name: "Differential 33 Inch", category: "Drivetrain", oem: "DIFF-33", minQty: 3, branch, warranty: "2 Years", source: "purchase_order", poNo: "PO-ZF-PARTS" },
    },
    {
      partNo: "PRT-DEMO-LED-DRL",
      description: "DRL LED Type Headlamp",
      qtyOnHand: 18,
      payload: { name: "DRL LED Type", category: "Electrical", oem: "LED-DRL", minQty: 5, branch, source: "manual" },
    },
    {
      partNo: "PRT-DEMO-BRK-F",
      description: "Front Brake Drum Set",
      qtyOnHand: 22,
      payload: { name: "Front Brake Drum", category: "Brakes", oem: "BRK-DRUM-F", minQty: 5, branch, source: "purchase_order", poNo: "PO-ZF-PARTS" },
    },
    {
      partNo: "PRT-DEMO-CHG-EASTMAN-18AMP",
      description: "EASTMAN 18AMP Charger (Vehicle Fitment)",
      qtyOnHand: 24,
      payload: { name: "EASTMAN 18AMP Charger", category: "Charger", oem: "CHG-EASTMAN-18AMP", minQty: 5, branch, source: "purchase_order", poNo: "PO-ZF-PARTS" },
    },
  ];

  for (const p of spareParts) {
    await SparePartInventory.create({ dealerId, tenantId, ...p });
  }

  const batteries = [
    {
      batteryNo: "BAT-EASTMAN-140AH-15M-48V",
      description: "EASTMAN 140AH 15 MONTHS 48V",
      qtyOnHand: 30,
      payload: { type: "EASTMAN 140AH 15 MONTHS 48V", capacity: "140Ah", voltage: "48V", warranty: "15 Months", minQty: 5, branch, source: "purchase_order", poNo: "PO-ZF-BAT" },
    },
    {
      batteryNo: "BAT-EASTMAN-105AH-48V",
      description: "EASTMAN 105AH",
      qtyOnHand: 18,
      payload: { type: "EASTMAN 105AH", capacity: "105Ah", voltage: "48V", warranty: "12 Months", minQty: 5, branch, priceDiff: -4500, source: "purchase_order", poNo: "PO-ZF-BAT" },
    },
    {
      batteryNo: "BAT-LIVGUARD-130AH-12M",
      description: "LIVGUARD 130AH 12MONTHS",
      qtyOnHand: 14,
      payload: { type: "LIVGUARD 130AH 12MONTHS", capacity: "130Ah", voltage: "48V", warranty: "12 Months", minQty: 4, branch, priceDiff: -2500, source: "purchase_order", poNo: "PO-ZF-BAT" },
    },
    {
      batteryNo: "BAT-LIVGUARD-140AH-15M",
      description: "LIVGUARD 140AH 15MONTHS",
      qtyOnHand: 10,
      payload: { type: "LIVGUARD 140AH 15MONTHS", capacity: "140Ah", voltage: "48V", warranty: "15 Months", minQty: 3, branch, priceDiff: 1800, source: "manual" },
    },
    {
      batteryNo: "BAT-EASTMAN-145AH-15M",
      description: "EASTMAN 145AH 15 MONTHS",
      qtyOnHand: 8,
      payload: { type: "EASTMAN 145AH 15 MONTHS", capacity: "145Ah", voltage: "48V", warranty: "15 Months", minQty: 3, branch, priceDiff: 6200, source: "purchase_order", poNo: "PO-ZF-BAT" },
    },
    {
      batteryNo: "BAT-EASTMAN-150AH-18M",
      description: "EASTMAN 150AH 18 MONTHS",
      qtyOnHand: 6,
      payload: { type: "EASTMAN 150AH 18 MONTHS", capacity: "150Ah", voltage: "48V", warranty: "18 Months", minQty: 3, branch, priceDiff: 10000, source: "purchase_order", poNo: "PO-ZF-BAT" },
    },
    {
      batteryNo: "BAT-60V-5X140AH-15M",
      description: "60V (5 BATTERY) EASTMAN 140AH 15M",
      qtyOnHand: 4,
      payload: { type: "60V (5 BATTERY) EASTMAN 140AH 15M", capacity: "140Ah x5", voltage: "60V", warranty: "15 Months", minQty: 2, branch, priceDiff: 10500, source: "manual" },
    },
    {
      batteryNo: "BAT-DEMO-LITHIUM-21AMP",
      description: "Lithium Battery + 21AMP Charger",
      qtyOnHand: 3,
      payload: { type: "LITHIUM AND 21AMP CHARGER", capacity: "Lithium", voltage: "48V", warranty: "3 Years", minQty: 2, branch, priceDiff: 10500, source: "manual" },
    },
  ];

  for (const b of batteries) {
    await BatteryInventory.create({ dealerId, tenantId, ...b });
  }

  return { vehicles: vehicles.length, spareParts: spareParts.length, batteries: batteries.length };
}
