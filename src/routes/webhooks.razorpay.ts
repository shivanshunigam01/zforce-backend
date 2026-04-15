import { Router } from "express";
import { processWebhookEvent } from "../services/cibil.service";
import { verifyRazorpayWebhookSignature } from "../services/razorpay.service";
import { AppError } from "../utils/errors";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const signature = req.header("X-Razorpay-Signature") || "";
    if (!verifyRazorpayWebhookSignature(req.rawBody || Buffer.from(JSON.stringify(req.body)), signature)) {
      throw new AppError(400, "INVALID_WEBHOOK_SIGNATURE", "Invalid Razorpay webhook signature");
    }
    await processWebhookEvent(req.body);
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

export default router;
