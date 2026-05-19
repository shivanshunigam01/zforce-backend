// @ts-nocheck
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env, isRazorpayConfigured, isSurepassConfiguredEnv } from "./config/env";
import { AppError } from "./utils/errors";
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

app.use(requestId);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError(403, "CORS_FORBIDDEN", `Origin not allowed: ${origin}`));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Dealer-Id", "Accept-Language", "X-Storefront-Slug"],
}));
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
