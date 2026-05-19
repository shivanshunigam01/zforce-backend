import axios from "axios";
import { env } from "../config/env";

const JSON_PATH = "/api/v1/credit-report-experian/fetch-report";
const PDF_PATH = "/api/v1/credit-report-experian/fetch-report-pdf";

export function isSurepassConfigured(overrides?: { baseUrl?: string; token?: string }): boolean {
  const baseUrl = overrides?.baseUrl ?? env.surepassBaseUrl;
  const token = overrides?.token ?? env.surepassToken;
  return Boolean(token) && /^https?:\/\//i.test(baseUrl);
}

function resolveSurepassEndpoints(overrides?: { baseUrl?: string }) {
  const base = overrides?.baseUrl ?? env.surepassBaseUrl;
  const baseUrl = base.endsWith("/") ? base : `${base}/`;
  return {
    json: new URL(JSON_PATH, baseUrl).toString(),
    pdf: new URL(PDF_PATH, baseUrl).toString()
  };
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

export type SurepassJsonResult = {
  ok: true;
  data: Record<string, unknown>;
  creditScore: number | null;
  reportNumber: string | null;
  reportDate: string | null;
  reportTime: string | null;
};

export type SurepassError = {
  ok: false;
  status: number;
  message: string;
  details?: unknown;
};

/**
 * POST Experian JSON report (after payment is verified server-side).
 */
export async function fetchExperianJsonReport(
  payload: SurepassReportPayload,
  overrides?: { baseUrl?: string; token?: string }
): Promise<SurepassJsonResult | SurepassError> {
  if (!isSurepassConfigured(overrides)) {
    return { ok: false, status: 503, message: "Surepass is not configured (SUREPASS_TOKEN)" };
  }

  const token = overrides?.token ?? env.surepassToken;
  const endpoints = resolveSurepassEndpoints(overrides);

  const mobileStr = normalizeMobileForSurepass(payload.mobile);
  const panStr = normalizePan(payload.pan);

  if (!/^\d{10}$/.test(mobileStr)) {
    return { ok: false, status: 400, message: "mobile must be 10 digits" };
  }
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panStr)) {
    return { ok: false, status: 400, message: "PAN format invalid (ABCDE1234F)" };
  }

  const spRes = await axios.post(
    endpoints.json,
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
      timeout: 45_000,
      validateStatus: () => true
    }
  );

  if (spRes.status < 200 || spRes.status >= 300) {
    return {
      ok: false,
      status: spRes.status,
      message: (spRes.data as { message?: string })?.message || "Surepass error",
      details: spRes.data
    };
  }

  const root = (spRes.data as { data?: Record<string, unknown> })?.data ?? {};
  const creditReport = root.credit_report as Record<string, unknown> | undefined;
  const header = creditReport?.CreditProfileHeader as Record<string, unknown> | undefined;

  const creditScore =
    typeof root.credit_score === "number"
      ? root.credit_score
      : root.credit_score != null
        ? Number(root.credit_score)
        : null;

  return {
    ok: true,
    data: root as Record<string, unknown>,
    creditScore: Number.isFinite(creditScore as number) ? (creditScore as number) : null,
    reportNumber: (header?.ReportNumber as string) ?? null,
    reportDate: (header?.ReportDate as string) ?? null,
    reportTime: (header?.ReportTime as string) ?? null
  };
}

export type SurepassPdfResult =
  | { ok: true; creditReportLink: string }
  | { ok: false; status: number; message: string; details?: unknown };

export async function fetchExperianPdfLink(
  payload: SurepassReportPayload,
  overrides?: { baseUrl?: string; token?: string }
): Promise<SurepassPdfResult> {
  if (!isSurepassConfigured(overrides)) {
    return { ok: false, status: 503, message: "Surepass is not configured" };
  }

  const token = overrides?.token ?? env.surepassToken;
  const endpoints = resolveSurepassEndpoints(overrides);

  const mobileStr = normalizeMobileForSurepass(payload.mobile);
  const panStr = normalizePan(payload.pan);

  const spRes = await axios.post(
    endpoints.pdf,
    { name: payload.name, consent: "Y", mobile: mobileStr, pan: panStr },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      timeout: 30_000,
      validateStatus: () => true
    }
  );

  if (spRes.status < 200 || spRes.status >= 300) {
    return {
      ok: false,
      status: spRes.status,
      message: (spRes.data as { message?: string })?.message || "Surepass PDF error",
      details: spRes.data
    };
  }

  const d = (spRes.data as { data?: Record<string, unknown> })?.data ?? {};
  const link =
    (d.credit_report_link as string) ||
    (d.report_url as string) ||
    (spRes.data as { credit_report_link?: string })?.credit_report_link;

  if (!link || typeof link !== "string") {
    return { ok: false, status: 502, message: "No PDF link in Surepass response", details: spRes.data };
  }

  return { ok: true, creditReportLink: link };
}
