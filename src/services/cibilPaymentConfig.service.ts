import { env } from "../config/env";
import { encryptSensitive, decryptSensitive } from "../utils/crypto";

export type CibilPaymentStored = {
  enabled?: boolean;
  feePaise?: number;
  razorpayKeyId?: string;
  razorpayKeySecretEncrypted?: string;
  razorpayWebhookSecretEncrypted?: string;
  surepassBaseUrl?: string;
  surepassTokenEncrypted?: string;
};

export type ResolvedCibilPaymentConfig = {
  enabled: boolean;
  feePaise: number;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  surepassBaseUrl: string;
  surepassToken: string;
};

export type CibilPaymentAdminView = {
  enabled: boolean;
  feeRupees: number;
  razorpayKeyId: string;
  surepassBaseUrl: string;
  hasRazorpaySecret: boolean;
  hasSurepassToken: boolean;
  hasWebhookSecret: boolean;
  paymentReady: boolean;
  surepassReady: boolean;
};

function readStored(storefront: { cibilPayment?: unknown }): CibilPaymentStored {
  const raw = storefront?.cibilPayment;
  if (!raw || typeof raw !== "object") return {};
  return raw as CibilPaymentStored;
}

function decryptField(encrypted?: string): string {
  if (!encrypted) return "";
  try {
    return decryptSensitive(encrypted);
  } catch {
    return "";
  }
}

/** Effective config: storefront admin settings, then server .env fallbacks. */
export function resolveCibilPaymentConfig(storefront: { cibilPayment?: unknown }): ResolvedCibilPaymentConfig {
  const stored = readStored(storefront);
  const feeStored = Number(stored.feePaise);
  const feePaise =
    Number.isFinite(feeStored) && feeStored >= 100 ? Math.round(feeStored) : env.cibilFeePaise;

  const razorpayKeyId = String(stored.razorpayKeyId || "").trim() || env.razorpayKeyId;
  const razorpayKeySecret =
    decryptField(stored.razorpayKeySecretEncrypted) || env.razorpayKeySecret;

  const surepassBaseUrl =
    String(stored.surepassBaseUrl || "").trim() || env.surepassBaseUrl;
  const surepassToken =
    decryptField(stored.surepassTokenEncrypted) || env.surepassToken;

  const enabled = stored.enabled !== false;

  return {
    enabled,
    feePaise,
    razorpayKeyId,
    razorpayKeySecret,
    surepassBaseUrl,
    surepassToken
  };
}

export function isCibilPaymentReady(cfg: ResolvedCibilPaymentConfig): boolean {
  return Boolean(cfg.enabled && cfg.razorpayKeyId && cfg.razorpayKeySecret);
}

export function isSurepassReady(cfg: ResolvedCibilPaymentConfig): boolean {
  return Boolean(cfg.surepassToken && /^https?:\/\//i.test(cfg.surepassBaseUrl));
}

export function cibilPaymentAdminView(storefront: { cibilPayment?: unknown }): CibilPaymentAdminView {
  const stored = readStored(storefront);
  const resolved = resolveCibilPaymentConfig(storefront);
  const hasStoredRzp = Boolean(stored.razorpayKeySecretEncrypted);
  const hasStoredSp = Boolean(stored.surepassTokenEncrypted);
  const hasEnvRzp = Boolean(env.razorpayKeySecret);
  const hasEnvSp = Boolean(env.surepassToken);

  return {
    enabled: resolved.enabled,
    feeRupees: resolved.feePaise / 100,
    razorpayKeyId: String(stored.razorpayKeyId || "").trim() || env.razorpayKeyId,
    surepassBaseUrl: String(stored.surepassBaseUrl || "").trim() || env.surepassBaseUrl,
    hasRazorpaySecret: hasStoredRzp || hasEnvRzp,
    hasSurepassToken: hasStoredSp || hasEnvSp,
    hasWebhookSecret: Boolean(stored.razorpayWebhookSecretEncrypted || env.razorpayWebhookSecret),
    paymentReady: isCibilPaymentReady(resolved),
    surepassReady: isSurepassReady(resolved)
  };
}

export function publicCibilConfigView(storefront: { cibilPayment?: unknown }) {
  const cfg = resolveCibilPaymentConfig(storefront);
  return {
    enabled: cfg.enabled && isCibilPaymentReady(cfg),
    feePaise: cfg.feePaise,
    feeRupees: cfg.feePaise / 100
  };
}

const PLACEHOLDER_SECRET = /^(•+|\.+|\*+)$/;

export function mergeCibilPaymentUpdate(
  existing: CibilPaymentStored,
  body: Record<string, unknown>
): CibilPaymentStored {
  const next: CibilPaymentStored = { ...existing };

  if (typeof body.enabled === "boolean") next.enabled = body.enabled;

  if (body.feeRupees !== undefined && body.feeRupees !== null && body.feeRupees !== "") {
    const rupees = Number(body.feeRupees);
    if (!Number.isFinite(rupees) || rupees < 1) {
      throw new Error("Fee must be at least ₹1");
    }
    next.feePaise = Math.round(rupees * 100);
  } else if (body.feePaise !== undefined) {
    const paise = Math.round(Number(body.feePaise));
    if (!Number.isFinite(paise) || paise < 100) {
      throw new Error("Fee must be at least 100 paise (₹1)");
    }
    next.feePaise = paise;
  }

  if (typeof body.razorpayKeyId === "string") {
    next.razorpayKeyId = body.razorpayKeyId.trim();
  }

  const rzpSecret = typeof body.razorpayKeySecret === "string" ? body.razorpayKeySecret.trim() : "";
  if (rzpSecret && !PLACEHOLDER_SECRET.test(rzpSecret)) {
    next.razorpayKeySecretEncrypted = encryptSensitive(rzpSecret);
  }

  const webhook = typeof body.razorpayWebhookSecret === "string" ? body.razorpayWebhookSecret.trim() : "";
  if (webhook && !PLACEHOLDER_SECRET.test(webhook)) {
    next.razorpayWebhookSecretEncrypted = encryptSensitive(webhook);
  }

  if (typeof body.surepassBaseUrl === "string") {
    next.surepassBaseUrl = body.surepassBaseUrl.trim();
  }

  const spToken = typeof body.surepassToken === "string" ? body.surepassToken.trim() : "";
  if (spToken && !PLACEHOLDER_SECRET.test(spToken)) {
    next.surepassTokenEncrypted = encryptSensitive(spToken);
  }

  return next;
}
