// @ts-nocheck
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env, isRazorpayConfigured, isSurepassConfiguredEnv } from "./config/env";
import { connectDb } from "./db/mongoose";
import { requestId } from "./middleware/requestId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import publicRoutes from "./routes/public.routes";
import dealerRoutes from "./routes/dealer.routes";
import adminRoutes from "./routes/admin.routes";
import distributorRoutes from "./routes/distributor.routes";
import mediaRoutes from "./routes/media.routes";
import webhookRoutes from "./routes/webhooks.razorpay";

const app = express();

/**
 * TEMPORARY open CORS for dev + production testing.
 * TODO: lock down to env.corsOrigins / production domains only when stable:
 *   https://zforceev.com, https://www.zforceev.com, https://admin.zforceev.com
 */
const openCors = cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Dealer-Id",
    "Accept-Language",
    "X-Storefront-Slug",
  ],
  credentials: true,
});

app.use(requestId);
app.use(helmet());
app.use(openCors);
app.options("*", openCors);
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json({
  limit: "10mb",
  verify: (req: any, _res, buf) => {
    req.rawBody = Buffer.from(buf);
  }
}));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/v1/webhooks/razorpay", webhookRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/v1/dealer", dealerRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/tenants/:tenantId/distributor", distributorRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`ZForce API listening on port ${env.port}`);
      console.log(
        `CIBIL: Razorpay ${isRazorpayConfigured() ? "ready" : "MISSING keys"} · Surepass ${
          isSurepassConfiguredEnv() ? "ready" : "MISSING token"
        } · fee ₹${env.cibilFeePaise / 100}`
      );
    });
  })
  .catch((error) => {
    console.error("Failed to start app", error);
    process.exit(1);
  });

export default app;
