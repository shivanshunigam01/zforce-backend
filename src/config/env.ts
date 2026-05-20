import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

/** Vite dev server for project-sanctuary uses port 8080; proxied POSTs send Origin: http://localhost:8080. */
function parseCorsOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "production") return fromEnv;
  const devExtras = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  return [...new Set([...fromEnv, ...devExtras])];
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 6544),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:6544",
  mongodbUri: required("MONGODB_URI"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev_access"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev_refresh"),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || "30d",
  corsOrigins: parseCorsOrigins(),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  cibilFeePaise: Number(process.env.CIBIL_FEE_PAISE || 7900),
  panEncryptionSecret: required("PAN_ENCRYPTION_SECRET", "dev_pan_encryption_secret_32_chars"),
  defaultStorefrontSlug: process.env.PUBLIC_STOREFRONT_DEFAULT_SLUG || "patna-auto",
  emailFrom: process.env.EMAIL_FROM || "no-reply@example.com",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  /** Surepass (Experian) — optional; CIBIL flow still saves payment without it */
  surepassBaseUrl: (process.env.SUREPASS_BASE_URL || "https://kyc-api.surepass.io").trim(),
  surepassToken: (process.env.SUREPASS_TOKEN || "").trim()
};

export function isRazorpayConfigured(): boolean {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

export function isSurepassConfiguredEnv(): boolean {
  return Boolean(env.surepassToken) && /^https?:\/\//i.test(env.surepassBaseUrl);
}
