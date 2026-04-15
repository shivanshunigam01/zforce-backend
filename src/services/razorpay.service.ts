import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env";

export const razorpay = new Razorpay({
  key_id: env.razorpayKeyId,
  key_secret: env.razorpayKeySecret
});

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const generated = crypto
    .createHmac("sha256", env.razorpayKeySecret)
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
