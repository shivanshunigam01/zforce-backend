import axios from "axios";
import { env } from "../config/env";

const PDF_PATH = "/api/v1/credit-report-experian/fetch-report-pdf";

export function isSurepassConfigured(overrides?: { baseUrl?: string; token?: string }): boolean {
  const baseUrl = overrides?.baseUrl ?? env.surepassBaseUrl;
  const token = overrides?.token ?? env.surepassToken;
  return Boolean(token) && /^https?:\/\//i.test(baseUrl);
}

function resolvePdfEndpoint(overrides?: { baseUrl?: string }) {
  const base = overrides?.baseUrl ?? env.surepassBaseUrl;
  const baseUrl = base.endsWith("/") ? base : `${base}/`;
  return new URL(PDF_PATH, baseUrl).toString();
}

export type SurepassReportPayload = {
  name: string;
  mobile: string;
  pan: string;
};

/** Normalize to 10-digit Indian mobile for Surepass */
export function normalizeMobileForSurepass(phone: string): string {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function normalizePan(pan: string): string {
  return String(pan).trim().toUpperCase();
}

function parseCreditScore(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

export type SurepassPdfReportResult =
  | {
      ok: true;
      creditScore: number | null;
      creditReportLink: string;
      clientId: string | null;
      data: Record<string, unknown>;
    }
  | { ok: false; status: number; message: string; details?: unknown };

/**
 * POST Experian credit report PDF (Surepass fetch-report-pdf).
 * Returns credit score and a presigned PDF URL.
 */
export async function fetchExperianPdfReport(
  payload: SurepassReportPayload,
  overrides?: { baseUrl?: string; token?: string }
): Promise<SurepassPdfReportResult> {
  if (!isSurepassConfigured(overrides)) {
    return { ok: false, status: 503, message: "Surepass is not configured (SUREPASS_TOKEN)" };
  }

  const token = overrides?.token ?? env.surepassToken;
  const endpoint = resolvePdfEndpoint(overrides);

  const mobileStr = normalizeMobileForSurepass(payload.mobile);
  const panStr = normalizePan(payload.pan);

  if (!/^\d{10}$/.test(mobileStr)) {
    return { ok: false, status: 400, message: "mobile must be 10 digits" };
  }
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panStr)) {
    return { ok: false, status: 400, message: "PAN format invalid (ABCDE1234F)" };
  }

  const spRes = await axios.post(
    endpoint,
    {
      name: payload.name,
      consent: "Y",
      mobile: mobileStr,
      pan: panStr
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      timeout: 60_000,
      validateStatus: () => true
    }
  );

  const body = spRes.data as {
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  };

  if (spRes.status < 200 || spRes.status >= 300 || body.success === false) {
    return {
      ok: false,
      status: spRes.status,
      message: body.message || "Surepass PDF error",
      details: spRes.data
    };
  }

  const d = body.data ?? {};
  const link =
    (d.credit_report_link as string) ||
    (d.report_url as string) ||
    (spRes.data as { credit_report_link?: string })?.credit_report_link;

  if (!link || typeof link !== "string") {
    return { ok: false, status: 502, message: "No PDF link in Surepass response", details: spRes.data };
  }

  return {
    ok: true,
    creditScore: parseCreditScore(d.credit_score),
    creditReportLink: link,
    clientId: (d.client_id as string) ?? null,
    data: d as Record<string, unknown>
  };
}
