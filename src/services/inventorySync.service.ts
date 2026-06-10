import {
  deductBatteryForVehicleSale,
  deductChargerForVehicleSale,
  releaseVehicleReservationByQuote,
  reserveVehicleForQuotation,
  syncVehicleStatus,
} from "./inventory.service";

function pickStr(...values: unknown[]): string {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function invoicePayload(row: Record<string, unknown>): Record<string, unknown> {
  const pl = row.payload;
  return pl && typeof pl === "object" ? (pl as Record<string, unknown>) : {};
}

function docPayload(row: Record<string, unknown>): Record<string, unknown> {
  const pl = row.payload;
  return pl && typeof pl === "object" ? (pl as Record<string, unknown>) : {};
}

function quotationCrmPayload(row: Record<string, unknown>): Record<string, unknown> {
  const pl = docPayload(row);
  const crm = pl.crm;
  return crm && typeof crm === "object" ? (crm as Record<string, unknown>) : pl;
}

/** Reserve chassis when a quotation/booking is saved with inventory allocation. */
export async function syncInventoryFromQuotation(
  dealerId: string,
  tenantId: string,
  quotation: Record<string, unknown>,
) {
  const crm = quotationCrmPayload(quotation);
  const chassis = pickStr(crm.chassis);
  const quoteNo = pickStr(quotation.quotationNo, crm.id);
  if (!quoteNo) return null;
  if (!chassis) {
    await releaseVehicleReservationByQuote(dealerId, quoteNo);
    return null;
  }
  await releaseVehicleReservationByQuote(dealerId, quoteNo);
  return reserveVehicleForQuotation(dealerId, tenantId, {
    chassisNo: chassis,
    quoteNo,
    customerName: pickStr(crm.name),
    model: pickStr(crm.model),
    variant: pickStr(crm.variant),
    colour: pickStr(crm.colour),
    batteryType: pickStr(crm.variant, crm.batteryType),
  });
}

/** Sync vehicle inventory when invoice is created or status changes. */
export async function syncInventoryFromInvoice(
  dealerId: string,
  tenantId: string,
  invoice: Record<string, unknown>,
) {
  const pl = invoicePayload(invoice);
  const chassisNo = pickStr(pl.chassis, pl.chassisNo, invoice.chassisNo);
  const invoiceNo = pickStr(invoice.invoiceNo);
  const model = pickStr(invoice.model, pl.model);
  const status = String(invoice.status || "").toLowerCase();

  if (!chassisNo && !invoiceNo) return null;

  if (status === "delivered") {
    return syncVehicleStatus(dealerId, tenantId, {
      chassisNo,
      invoiceNo,
      status: "delivered",
      customerName: pickStr(invoice.customerName, pl.name),
      model,
      variant: pickStr(pl.variant),
      colour: pickStr(pl.colour, pl.color),
      invoiceDate: pickStr(invoice.createdAt, pl.invoiceDate),
      deliveryDate: new Date().toISOString(),
    });
  }

  if (status === "created" || status === "billed" || status === "billed_not_delivered") {
    const vehicle = await syncVehicleStatus(dealerId, tenantId, {
      chassisNo,
      invoiceNo,
      status: "billed_not_delivered",
      customerName: pickStr(invoice.customerName, pl.name),
      model,
      variant: pickStr(pl.variant),
      colour: pickStr(pl.colour, pl.color),
      quoteNo: pickStr(pl.quoteNo, invoice.linkedQuoteId),
      invoiceDate: pickStr(invoice.createdAt, pl.invoiceDate),
    });
    const vehiclePl =
      vehicle?.payload && typeof vehicle.payload === "object"
        ? (vehicle.payload as Record<string, unknown>)
        : {};
    if (!vehiclePl.stockDeducted) {
      const batteryType = pickStr(vehiclePl.batteryType, pl.variant);
      await deductBatteryForVehicleSale(dealerId, batteryType);
      await deductChargerForVehicleSale(dealerId);
      if (vehicle) {
        vehicle.payload = { ...vehiclePl, stockDeducted: true };
        await vehicle.save();
      }
    }
    return vehicle;
  }

  return null;
}

/** Mark vehicle delivered when delivery confirmation is completed. */
export async function syncInventoryFromDeliveryConfirmation(
  dealerId: string,
  tenantId: string,
  confirmation: Record<string, unknown>,
) {
  const pl = docPayload(confirmation);
  const status = String(confirmation.status || "").toLowerCase();
  if (!status.includes("deliver")) return null;

  const chassisNo = pickStr(pl.chassis, pl.chassisNo, confirmation.chassisNo);
  const invoiceNo = pickStr(confirmation.invoiceNo, pl.invoiceNo);

  return syncVehicleStatus(dealerId, tenantId, {
    chassisNo,
    invoiceNo,
    status: "delivered",
    customerName: pickStr(pl.name, pl.customerName, confirmation.customerName),
    model: pickStr(pl.model, confirmation.model),
    variant: pickStr(pl.variant),
    colour: pickStr(pl.colour, pl.color),
    deliveryDate: pickStr(pl.deliveredOn, new Date().toISOString()),
  });
}

/** Link chassis to invoice when delivery checklist is completed. */
export async function syncInventoryFromChecklist(
  dealerId: string,
  tenantId: string,
  checklist: Record<string, unknown>,
) {
  const pl = docPayload(checklist);
  const status = String(checklist.status || "").toLowerCase();
  if (status !== "completed") return null;

  const chassisNo = pickStr(pl.chassis, checklist.chassisNo);
  const invoiceNo = pickStr(checklist.invoiceNo);

  return syncVehicleStatus(dealerId, tenantId, {
    chassisNo,
    invoiceNo,
    status: "billed_not_delivered",
    customerName: pickStr(pl.name, checklist.customerName),
    model: pickStr(pl.model, checklist.model),
    variant: pickStr(pl.variant),
    colour: pickStr(pl.colour, pl.color),
  });
}
