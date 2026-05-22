/** Dealer CRM customers are always KYC-verified on create/update. */
export function normalizeCustomerKycForSave(kyc: unknown): {
  status: string;
  autoVerified: boolean;
  documents?: unknown[];
} {
  const verified = { status: "Verified", autoVerified: true } as const;
  if (!kyc) return { ...verified };
  if (typeof kyc === "string") return { ...verified };
  if (typeof kyc === "object") {
    const o = kyc as { documents?: unknown[] };
    if (Array.isArray(o.documents) && o.documents.length > 0) {
      return { status: "Verified", autoVerified: true, documents: o.documents };
    }
  }
  return { ...verified };
}
