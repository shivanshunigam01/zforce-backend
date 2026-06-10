import VehicleInventory from "../models/VehicleInventory";
import SparePartInventory from "../models/SparePartInventory";
import BatteryInventory from "../models/BatteryInventory";
import PurchaseOrder from "../models/PurchaseOrder";
import StockReceipt from "../models/StockReceipt";

export type VehicleInventoryStatus =
  | "available"
  | "reserved"
  | "billed_not_delivered"
  | "delivered";

export type PoLineCategory = "vehicle" | "spare_part" | "battery";

export type GrnLineInput = {
  lineIndex?: number;
  sku?: string;
  receivedQty: number;
  qualityStatus?: "OK" | "Not OK" | "Pending";
  qualityRemarks?: string;
};

export type GrnReceiveInput = {
  lines: GrnLineInput[];
  checkedBy: string;
  remarks?: string;
  qualityRemarks?: string;
  actionableDate?: string;
};

type PoLineDoc = {
  sku?: string;
  name?: string;
  category?: string;
  orderedQty?: number;
  receivedQty?: number;
  qty?: number;
  pricePaise?: number;
  variant?: string;
  colour?: string;
};

function pickStr(...values: unknown[]): string {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function lineOrderedQty(line: PoLineDoc): number {
  return Number(line.orderedQty ?? line.qty) || 0;
}

function lineReceivedQty(line: PoLineDoc): number {
  return Number(line.receivedQty) || 0;
}

function linePendingQty(line: PoLineDoc): number {
  return Math.max(0, lineOrderedQty(line) - lineReceivedQty(line));
}

export function inferPoCategory(sku: string, category?: string): PoLineCategory {
  const cat = String(category || "").toLowerCase();
  if (cat === "vehicle") return "vehicle";
  if (cat === "battery") return "battery";
  if (cat === "spare_part" || cat === "spare part") return "spare_part";

  const s = sku.toLowerCase();
  if (s.startsWith("mdl-") || s.includes("zforce")) return "vehicle";
  if (s.startsWith("bat-") || s.includes("battery") || s.includes("lithium")) return "battery";
  return "spare_part";
}

function parseVehicleSku(sku: string): { model: string; variant?: string; colour?: string } {
  const sep = sku.includes(" — ") ? " — " : sku.includes(" / ") ? " / " : null;
  if (!sep) return { model: sku };
  const parts = sku.split(sep).map((p) => p.trim()).filter(Boolean);
  return {
    model: parts[0] || sku,
    variant: parts[1],
    colour: parts[2],
  };
}

async function addQtyToInventory(
  dealerId: string,
  tenantId: string,
  line: PoLineDoc,
  qty: number,
  poNo: string,
  branch?: string,
) {
  const sku = pickStr(line.sku);
  if (!sku || qty <= 0) return { vehicles: [] as string[], parts: [] as string[], batteries: [] as string[] };

  const category = inferPoCategory(sku, line.category);
  const parsed = parseVehicleSku(sku);
  const model = pickStr(line.name, parsed.model);
  const variant = pickStr(line.variant, parsed.variant);
  const colour = pickStr(line.colour, parsed.colour);

  const createdVehicles: string[] = [];
  const updatedParts: string[] = [];
  const updatedBatteries: string[] = [];

  if (category === "vehicle") {
    for (let i = 0; i < qty; i++) {
      const stamp = `${Date.now().toString(36).toUpperCase()}${i}`;
      const stockNo = `STK-${stamp}`;
      const chassisNo = `ZFCH-${stamp}`;
      await VehicleInventory.create({
        dealerId,
        tenantId,
        stockNo,
        chassisNo,
        model,
        status: "available",
        payload: {
          variant: variant || undefined,
          colour: colour || undefined,
          branch: branch || undefined,
          source: "purchase_order",
          poNo,
          mfgDate: new Date().toISOString().slice(0, 10),
        },
      });
      createdVehicles.push(stockNo);
    }
  } else if (category === "battery") {
    const batteryNo =
      sku.replace(/\s+/g, "-").toUpperCase().slice(0, 40) || `BAT-${Date.now()}`;
    const existing = await BatteryInventory.findOne({ dealerId, batteryNo });
    if (existing) {
      existing.qtyOnHand = (existing.qtyOnHand || 0) + qty;
      const pl = (existing.payload || {}) as Record<string, unknown>;
      existing.payload = { ...pl, source: "purchase_order", poNo, branch };
      await existing.save();
    } else {
      await BatteryInventory.create({
        dealerId,
        tenantId,
        batteryNo,
        description: model,
        qtyOnHand: qty,
        payload: {
          type: model,
          source: "purchase_order",
          poNo,
          branch,
          minQty: 3,
        },
      });
    }
    updatedBatteries.push(batteryNo);
  } else {
    const partNo = sku.replace(/\s+/g, "-").toUpperCase().slice(0, 40) || `PRT-${Date.now()}`;
    const existing = await SparePartInventory.findOne({ dealerId, partNo });
    if (existing) {
      existing.qtyOnHand = (existing.qtyOnHand || 0) + qty;
      const pl = (existing.payload || {}) as Record<string, unknown>;
      existing.payload = { ...pl, source: "purchase_order", poNo, branch };
      await existing.save();
    } else {
      await SparePartInventory.create({
        dealerId,
        tenantId,
        partNo,
        description: model,
        qtyOnHand: qty,
        payload: {
          name: model,
          category: "General",
          source: "purchase_order",
          poNo,
          branch,
          minQty: 5,
        },
      });
    }
    updatedParts.push(partNo);
  }

  return { vehicles: createdVehicles, parts: updatedParts, batteries: updatedBatteries };
}

function normalizePoLines(lines: PoLineDoc[]): PoLineDoc[] {
  return lines.map((line) => ({
    ...line,
    orderedQty: lineOrderedQty(line),
    receivedQty: lineReceivedQty(line),
  }));
}

function computePoStatus(lines: PoLineDoc[]): string {
  const normalized = normalizePoLines(lines);
  if (normalized.length === 0) return "ordered";
  const allDone = normalized.every((l) => lineReceivedQty(l) >= lineOrderedQty(l));
  const anyReceived = normalized.some((l) => lineReceivedQty(l) > 0);
  if (allDone) return "received";
  if (anyReceived) return "partially_received";
  return "accepted";
}

/** Find vehicle by chassis or invoice number in payload. */
export async function findVehicleByChassisOrInvoice(
  dealerId: string,
  input: { chassisNo?: string; invoiceNo?: string },
) {
  const chassis = input.chassisNo?.trim();
  if (chassis) {
    const byChassis = await VehicleInventory.findOne({ dealerId, chassisNo: chassis });
    if (byChassis) return byChassis;
  }
  const invoiceNo = input.invoiceNo?.trim();
  if (invoiceNo) {
    return VehicleInventory.findOne({
      dealerId,
      $or: [{ "payload.invoiceNo": invoiceNo }],
    });
  }
  return null;
}

export async function syncVehicleStatus(
  dealerId: string,
  tenantId: string,
  input: {
    chassisNo?: string;
    invoiceNo?: string;
    status: VehicleInventoryStatus;
    customerName?: string;
    model?: string;
    quoteNo?: string;
    invoiceDate?: string;
    deliveryDate?: string;
    variant?: string;
    colour?: string;
    branch?: string;
  },
) {
  let vehicle = await findVehicleByChassisOrInvoice(dealerId, input);
  const chassis = input.chassisNo?.trim();
  const invoiceNo = input.invoiceNo?.trim();

  const payloadPatch: Record<string, unknown> = {};
  if (input.customerName) payloadPatch.customerName = input.customerName;
  if (input.model) payloadPatch.model = input.model;
  if (input.quoteNo) payloadPatch.quoteNo = input.quoteNo;
  if (invoiceNo) payloadPatch.invoiceNo = invoiceNo;
  if (input.invoiceDate) payloadPatch.invoiceDate = input.invoiceDate;
  if (input.deliveryDate) payloadPatch.deliveryDate = input.deliveryDate;
  if (input.variant) payloadPatch.variant = input.variant;
  if (input.colour) payloadPatch.colour = input.colour;
  if (input.branch) payloadPatch.branch = input.branch;

  if (!vehicle && chassis && input.model) {
    const stockNo = `STK-${Date.now().toString(36).toUpperCase()}`;
    vehicle = await VehicleInventory.create({
      dealerId,
      tenantId,
      stockNo,
      chassisNo: chassis,
      model: input.model,
      status: input.status,
      payload: payloadPatch,
    });
    return vehicle;
  }

  if (!vehicle) return null;

  vehicle.status = input.status;
  const pl = (vehicle.payload && typeof vehicle.payload === "object"
    ? vehicle.payload
    : {}) as Record<string, unknown>;
  vehicle.payload = { ...pl, ...payloadPatch };
  if (input.model) vehicle.model = input.model;
  if (chassis) vehicle.chassisNo = chassis;
  await vehicle.save();
  return vehicle;
}

/** Receive goods against a PO (partial or full GRN). Only OK-quality qty is added to inventory. */
export async function receiveGrnAgainstPo(
  dealerId: string,
  tenantId: string,
  poId: string,
  input: GrnReceiveInput,
) {
  const row = await PurchaseOrder.findOne({ _id: poId, dealerId });
  if (!row) return null;

  const poStatus = String(row.status || "").toLowerCase();
  if (poStatus === "cancelled" || poStatus === "draft") {
    throw new Error("Purchase order is not ready for receiving");
  }

  const poLines = normalizePoLines(Array.isArray(row.lines) ? (row.lines as PoLineDoc[]) : []);
  if (poLines.length === 0) throw new Error("Purchase order has no lines");

  const receiptLines: Array<{
    sku: string;
    name: string;
    orderedQty: number;
    receivedQty: number;
    qualityStatus: string;
    qualityRemarks?: string;
  }> = [];

  const createdVehicles: string[] = [];
  const updatedParts: string[] = [];
  const updatedBatteries: string[] = [];

  for (const recv of input.lines) {
    const idx =
      recv.lineIndex !== undefined
        ? recv.lineIndex
        : recv.sku
          ? poLines.findIndex((l) => pickStr(l.sku) === recv.sku?.trim())
          : -1;
    if (idx < 0 || idx >= poLines.length) continue;

    const line = { ...poLines[idx] };
    const pending = linePendingQty(line);
    const recvQty = Math.max(0, Number(recv.receivedQty) || 0);
    if (recvQty <= 0) continue;
    if (recvQty > pending) {
      throw new Error(
        `Cannot receive ${recvQty} for line ${idx + 1}; only ${pending} pending`,
      );
    }

    const quality = String(recv.qualityStatus || "OK").toUpperCase();
    const inventoryQty = quality === "OK" ? recvQty : 0;

    if (inventoryQty > 0) {
      const added = await addQtyToInventory(
        dealerId,
        tenantId,
        line,
        inventoryQty,
        row.poNo,
        row.branch,
      );
      createdVehicles.push(...added.vehicles);
      updatedParts.push(...added.parts);
      updatedBatteries.push(...added.batteries);
    }

    line.receivedQty = lineReceivedQty(line) + recvQty;
    poLines[idx] = line;

    receiptLines.push({
      sku: pickStr(line.sku),
      name: pickStr(line.name, parseVehicleSku(pickStr(line.sku)).model),
      orderedQty: lineOrderedQty(line),
      receivedQty: recvQty,
      qualityStatus: recv.qualityStatus || "OK",
      qualityRemarks: recv.qualityRemarks,
    });
  }

  if (receiptLines.length === 0) {
    throw new Error("No valid receipt lines provided");
  }

  row.lines = poLines as never;
  row.status = computePoStatus(poLines);
  await row.save();

  const totalOrdered = poLines.reduce((s, l) => s + lineOrderedQty(l), 0);
  const totalReceivedThisGrn = receiptLines.reduce((s, l) => s + l.receivedQty, 0);
  const totalReceivedPo = poLines.reduce((s, l) => s + lineReceivedQty(l), 0);
  const receiptStatus =
    totalReceivedPo >= totalOrdered ? "received" : "partially_received";

  const stamp = Date.now();
  const receipt = await StockReceipt.create({
    dealerId,
    tenantId,
    receiptNo: `SR-${stamp}`,
    grnNo: `GRN-${stamp}`,
    poId: String(row._id),
    poNo: row.poNo,
    supplier: row.supplier,
    branch: row.branch,
    partType: row.partType,
    checkedBy: input.checkedBy,
    remarks: input.remarks,
    qualityStatus: receiptLines.every((l) => l.qualityStatus === "OK")
      ? "OK"
      : receiptLines.some((l) => l.qualityStatus === "Not OK")
        ? "Not OK"
        : "Pending",
    qualityRemarks: input.qualityRemarks,
    actionableDate: input.actionableDate ? new Date(input.actionableDate) : undefined,
    status: receiptStatus,
    lines: receiptLines,
    payload: {
      orderedQty: totalOrdered,
      receivedQty: totalReceivedThisGrn,
    },
  });

  return {
    receipt,
    purchaseOrder: row,
    createdVehicles,
    updatedParts,
    updatedBatteries,
  };
}

/** Legacy full receive — receives all pending qty as OK. */
export async function receivePurchaseOrder(
  dealerId: string,
  tenantId: string,
  poId: string,
) {
  const row = await PurchaseOrder.findOne({ _id: poId, dealerId });
  if (!row) return null;

  const poLines = normalizePoLines(Array.isArray(row.lines) ? (row.lines as PoLineDoc[]) : []);
  const lines: GrnLineInput[] = poLines
    .map((line, lineIndex) => ({
      lineIndex,
      receivedQty: linePendingQty(line),
      qualityStatus: "OK" as const,
    }))
    .filter((l) => l.receivedQty > 0);

  if (lines.length === 0) {
    throw new Error("Nothing left to receive on this purchase order");
  }

  const result = await receiveGrnAgainstPo(dealerId, tenantId, poId, {
    lines,
    checkedBy: "System",
    remarks: "Full PO receive",
  });

  if (!result) return null;

  return {
    receipt: result.receipt,
    createdVehicles: result.createdVehicles,
    updatedParts: result.updatedParts,
    updatedBatteries: result.updatedBatteries,
  };
}

/** Map quotation battery variant labels to seeded battery SKUs. */
const BATTERY_VARIANT_TO_NO: Record<string, string> = {
  "eastman 140ah 15 months 48v": "BAT-EASTMAN-140AH-15M-48V",
  "eastman 105ah": "BAT-EASTMAN-105AH-48V",
  "livguard 130ah 12months": "BAT-LIVGUARD-130AH-12M",
  "livguard 140ah 15months": "BAT-LIVGUARD-140AH-15M",
  "eastman 145ah 15 months": "BAT-EASTMAN-145AH-15M",
  "eastman 150ah 18 months": "BAT-EASTMAN-150AH-18M",
  "60v (5 battery) eastman 140ah 15m": "BAT-60V-5X140AH-15M",
};

function batteryNoFromType(batteryType?: string): string | null {
  const key = String(batteryType || "eastman 140ah 15 months 48v")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return BATTERY_VARIANT_TO_NO[key] || "BAT-EASTMAN-140AH-15M-48V";
}

export async function deductBatteryForVehicleSale(dealerId: string, batteryType?: string) {
  const batteryNo = batteryNoFromType(batteryType);
  if (!batteryNo) return false;
  const row = await BatteryInventory.findOne({ dealerId, batteryNo });
  if (!row || (row.qtyOnHand || 0) <= 0) return false;
  row.qtyOnHand = Math.max(0, (row.qtyOnHand || 0) - 1);
  await row.save();
  return true;
}

export async function deductChargerForVehicleSale(dealerId: string) {
  const partNo = "PRT-CHG-EASTMAN-18AMP";
  const row = await SparePartInventory.findOne({ dealerId, partNo });
  if (!row || (row.qtyOnHand || 0) <= 0) return false;
  row.qtyOnHand = Math.max(0, (row.qtyOnHand || 0) - 1);
  await row.save();
  return true;
}

export async function releaseVehicleReservationByQuote(dealerId: string, quoteNo: string) {
  const trimmed = quoteNo.trim();
  if (!trimmed) return;
  const rows = await VehicleInventory.find({ dealerId, linkedQuoteId: trimmed, status: "reserved" });
  for (const vehicle of rows) {
    vehicle.status = "available";
    vehicle.linkedQuoteId = undefined;
    const pl = (vehicle.payload && typeof vehicle.payload === "object"
      ? vehicle.payload
      : {}) as Record<string, unknown>;
    const next = { ...pl };
    delete next.quoteNo;
    delete next.customerName;
    if (next.source === "quotation") next.source = "manual";
    vehicle.payload = next;
    await vehicle.save();
  }
}

export async function reserveVehicleForQuotation(
  dealerId: string,
  tenantId: string,
  input: {
    chassisNo: string;
    quoteNo: string;
    customerName?: string;
    model?: string;
    variant?: string;
    colour?: string;
    batteryType?: string;
  },
) {
  const chassis = input.chassisNo?.trim();
  const quoteNo = input.quoteNo?.trim();
  if (!chassis || !quoteNo) return null;

  const vehicle = await VehicleInventory.findOne({ dealerId, chassisNo: chassis });
  if (!vehicle) throw new Error(`Chassis ${chassis} not found in inventory`);
  if (vehicle.status === "delivered") throw new Error(`Chassis ${chassis} is already delivered`);
  if (vehicle.status === "billed_not_delivered") {
    throw new Error(`Chassis ${chassis} is already billed`);
  }
  if (
    vehicle.status === "reserved" &&
    vehicle.linkedQuoteId &&
    vehicle.linkedQuoteId !== quoteNo
  ) {
    throw new Error(`Chassis ${chassis} is reserved for another quotation`);
  }

  vehicle.status = "reserved";
  vehicle.linkedQuoteId = quoteNo;
  const pl = (vehicle.payload && typeof vehicle.payload === "object"
    ? vehicle.payload
    : {}) as Record<string, unknown>;
  vehicle.payload = {
    ...pl,
    quoteNo,
    customerName: input.customerName || pl.customerName,
    variant: input.variant || pl.variant,
    colour: input.colour || pl.colour,
    batteryType: input.batteryType || pl.batteryType || input.variant,
    source: "quotation",
  };
  if (input.model) vehicle.model = input.model;
  await vehicle.save();
  return vehicle;
}
