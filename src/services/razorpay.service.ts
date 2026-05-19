import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env";

export const razorpay = new Razorpay({
  key_id: env.razorpayKeyId,
  key_secret: env.razorpayKeySecret
});

export function createRazorpayClient(keyId: string, keySecret: string) {
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string = env.razorpayKeySecret
): boolean {
  if (!keySecret) return false;
  const generated = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return generated === signature;
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const digest = crypto.createHmac("sha256", env.razorpayWebhookSecret).update(rawBody).digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(signature || "", "utf8");
  if (digestBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}
