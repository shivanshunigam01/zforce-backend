import Customer from "../models/Customer";

const PREFIX = "zforcec-";
const ID_RE = /^zforcec-(\d+)$/i;

export function formatCustomerId(seq: number): string {
  return `${PREFIX}${String(seq).padStart(3, "0")}`;
}

export async function maxCustomerSeqForDealer(dealerId: string): Promise<number> {
  const rows = await Customer.find({ dealerId }).select("customerId").lean();
  let max = 0;
  for (const row of rows) {
    const id = String(row.customerId || "");
    const m = ID_RE.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

export async function nextCustomerId(dealerId: string): Promise<string> {
  const seq = (await maxCustomerSeqForDealer(dealerId)) + 1;
  return formatCustomerId(seq);
}

/** Assign zforcec-### to legacy rows that only have Mongo _id. */
export async function backfillCustomerIdsForDealer(dealerId: string): Promise<number> {
  const missing = await Customer.find({
    dealerId,
    $or: [{ customerId: { $exists: false } }, { customerId: null }, { customerId: "" }],
  })
    .sort({ createdAt: 1 });

  if (!missing.length) return 0;

  let seq = await maxCustomerSeqForDealer(dealerId);
  for (const doc of missing) {
    seq += 1;
    doc.customerId = formatCustomerId(seq);
    await doc.save();
  }
  return missing.length;
}
