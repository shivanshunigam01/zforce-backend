import MasterRecord from "../models/MasterRecord";
import Storefront from "../models/Storefront";
import { MASTER_PRESETS } from "../data/masterPresets";

export type MasterSeedResult = {
  dealerId: string;
  created: number;
  updated: number;
  skipped: number;
  total: number;
  byType: Record<string, number>;
};

/**
 * Upsert demo master rows for a dealer (idempotent by dealerId + type + code).
 */
export async function seedMasterPresetsForDealer(
  dealerId: string,
  tenantId?: string
): Promise<MasterSeedResult> {
  let resolvedTenant = tenantId?.trim() || "";
  if (!resolvedTenant) {
    const sf = await Storefront.findOne({ dealerId }).select("tenantId").lean();
    resolvedTenant = (sf?.tenantId as string) || "tenant-demo";
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const byType: Record<string, number> = {};

  for (const row of MASTER_PRESETS) {
    const code = row.code.trim();
    if (!code) {
      skipped += 1;
      continue;
    }

    const existing = await MasterRecord.findOne({ dealerId, type: row.type, code });
    if (existing) {
      existing.name = row.name;
      existing.status = row.status || "Active";
      existing.extra = row.extra || {};
      existing.tenantId = resolvedTenant;
      await existing.save();
      updated += 1;
    } else {
      await MasterRecord.create({
        dealerId,
        tenantId: resolvedTenant,
        type: row.type,
        code,
        name: row.name,
        status: row.status || "Active",
        extra: row.extra || {},
      });
      created += 1;
    }
    byType[row.type] = (byType[row.type] || 0) + 1;
  }

  return {
    dealerId,
    created,
    updated,
    skipped,
    total: MASTER_PRESETS.length,
    byType,
  };
}
