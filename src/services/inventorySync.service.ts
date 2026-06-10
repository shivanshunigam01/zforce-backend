import { syncVehicleStatus } from "./inventory.service";

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
    return syncVehicleStatus(dealerId, tenantId, {
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
