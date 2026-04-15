import crypto from "crypto";
import { env } from "../config/env";

function key() {
  return crypto.createHash("sha256").update(env.panEncryptionSecret).digest();
}

export function encryptSensitive(value: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSensitive(payload: string): string {
  const [ivHex, dataHex] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key(), Buffer.from(ivHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

export function maskPan(pan?: string): string | undefined {
  if (!pan || pan.length < 4) return undefined;
  return `${"*".repeat(Math.max(0, pan.length - 4))}${pan.slice(-4)}`;
}
