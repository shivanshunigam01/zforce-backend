// @ts-nocheck
import { Router } from "express";
import crypto from "crypto";
import User from "../models/User";
import RefreshToken from "../models/RefreshToken";
import { validate } from "../middleware/validate";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema
} from "../validators/auth.validators";
import { AppError } from "../utils/errors";
import { hashPassword, signAccessToken, signRefreshToken, verifyPassword, verifyRefreshToken } from "../utils/auth";
import { sendForgotPasswordEmail } from "../services/email.service";
import { authJwt } from "../middleware/authJwt";
import { toJSON } from "../utils/api";

const router = Router();

function refreshHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** HO panel: `super_admin` or `ho_staff` users (same tokens as /admin/*). */
async function loginAdminPanel(req: any, res: any) {
  const { userId, password } = req.body;
  const user = await User.findOne({ userId, role: { $in: ["super_admin", "ho_staff"] }, isActive: true });
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new AppError(403, "ACCOUNT_LOCKED", "Account temporarily locked");
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    user.loginFailures = (user.loginFailures || 0) + 1;
    if (user.loginFailures >= 5) user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  user.loginFailures = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const payload = {
    sub: String(user._id),
    role: user.role,
    tenantId: user.tenantId,
    dealerId: user.dealerId,
    branchIds: user.branchIds || [],
    permissions: user.permissions || []
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ ...payload, type: "refresh", version: user.refreshTokenVersion });
  await RefreshToken.create({
    userId: String(user._id),
    role: user.role,
    tokenHash: refreshHash(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.headers["user-agent"] || "",
    ipAddress: req.ip
  });

  return res.json({
    data: {
      accessToken,
      refreshToken,
      expiresIn: "15m",
      user: {
        id: String(user._id),
        role: user.role,
        displayName: user.displayName,
        tenantId: user.tenantId,
        dealerId: user.dealerId,
        branchIds: user.branchIds || [],
        permissions: user.permissions || []
      }
    }
  });
}

async function loginByRole(req: any, res: any, role: string) {
  const { userId, password } = req.body;
  const user = await User.findOne({ userId, role, isActive: true });
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw new AppError(403, "ACCOUNT_LOCKED", "Account temporarily locked");
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    user.loginFailures = (user.loginFailures || 0) + 1;
    if (user.loginFailures >= 5) user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  user.loginFailures = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const payload = {
    sub: String(user._id),
    role: user.role,
    tenantId: user.tenantId,
    dealerId: user.dealerId,
    branchIds: user.branchIds || [],
    permissions: user.permissions || []
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ ...payload, type: "refresh", version: user.refreshTokenVersion });
  await RefreshToken.create({
    userId: String(user._id),
    role: user.role,
    tokenHash: refreshHash(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.headers["user-agent"] || "",
    ipAddress: req.ip
  });

  return res.json({
    data: {
      accessToken,
      refreshToken,
      expiresIn: "15m",
      user: {
        id: String(user._id),
        role: user.role,
        displayName: user.displayName,
        tenantId: user.tenantId,
        dealerId: user.dealerId,
        branchIds: user.branchIds || [],
        permissions: user.permissions || []
      }
    }
  });
}

async function refreshByRole(req: any, res: any, role: string) {
  const { refreshToken } = req.body;
  const payload = verifyRefreshToken(refreshToken);
  if (payload.role !== role && !(role === "super_admin" && ["super_admin", "ho_staff"].includes(payload.role))) {
    throw new AppError(403, "FORBIDDEN", "Role mismatch");
  }

  const tokenHash = refreshHash(refreshToken);
  const saved = await RefreshToken.findOne({ tokenHash, revokedAt: null });
  if (!saved) throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token revoked or not found");

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new AppError(401, "INVALID_REFRESH_TOKEN", "User no longer active");

  saved.revokedAt = new Date();
  await saved.save();

  const nextPayload = {
    sub: String(user._id),
    role: user.role,
    tenantId: user.tenantId,
    dealerId: user.dealerId,
    branchIds: user.branchIds || [],
    permissions: user.permissions || []
  };

  const nextAccessToken = signAccessToken(nextPayload);
  const nextRefreshToken = signRefreshToken({ ...nextPayload, type: "refresh", version: user.refreshTokenVersion });
  await RefreshToken.create({
    userId: String(user._id),
    role: user.role,
    tokenHash: refreshHash(nextRefreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.headers["user-agent"] || "",
    ipAddress: req.ip
  });

  return res.json({ data: { accessToken: nextAccessToken, refreshToken: nextRefreshToken, expiresIn: "15m" } });
}

async function logout(req: any, res: any) {
  const refreshToken = req.body.refreshToken;
  if (refreshToken) {
    await RefreshToken.findOneAndUpdate(
      { tokenHash: refreshHash(refreshToken), revokedAt: null },
      { revokedAt: new Date() }
    );
  }
  return res.json({ data: { success: true } });
}

router.post("/admin/login", validate(loginSchema), async (req, res, next) => {
  try { await loginAdminPanel(req, res); } catch (e) { next(e); }
});
router.post("/admin/refresh", validate(refreshSchema), async (req, res, next) => {
  try { await refreshByRole(req, res, "super_admin"); } catch (e) { next(e); }
});
router.post("/admin/logout", async (req, res, next) => {
  try { await logout(req, res); } catch (e) { next(e); }
});
router.get("/admin/me", authJwt(["super_admin", "ho_staff"]), async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.sub);
    res.json({ data: toJSON(user) });
  } catch (e) { next(e); }
});

router.post("/distributor/login", validate(loginSchema), async (req, res, next) => {
  try { await loginByRole(req, res, "distributor"); } catch (e) { next(e); }
});
router.post("/distributor/refresh", validate(refreshSchema), async (req, res, next) => {
  try { await refreshByRole(req, res, "distributor"); } catch (e) { next(e); }
});
router.post("/distributor/logout", async (req, res, next) => {
  try { await logout(req, res); } catch (e) { next(e); }
});
router.get("/distributor/me", authJwt(["distributor", "super_admin"]), async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.sub);
    res.json({ data: toJSON(user) });
  } catch (e) { next(e); }
});

router.post("/dealer/login", validate(loginSchema), async (req, res, next) => {
  try { await loginByRole(req, res, "dealer"); } catch (e) { next(e); }
});
router.post("/dealer/refresh", validate(refreshSchema), async (req, res, next) => {
  try { await refreshByRole(req, res, "dealer"); } catch (e) { next(e); }
});
router.post("/dealer/logout", async (req, res, next) => {
  try { await logout(req, res); } catch (e) { next(e); }
});
router.get("/dealer/me", authJwt(["dealer", "super_admin", "ho_staff"]), async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.sub);
    res.json({ data: toJSON(user) });
  } catch (e) { next(e); }
});

router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email, role: req.body.panel === "admin" ? { $in: ["super_admin", "ho_staff"] } : req.body.panel });
    if (user) {
      const token = crypto.randomBytes(24).toString("hex");
      await sendForgotPasswordEmail(req.body.email, token);
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

router.post("/reset-password", validate(resetPasswordSchema), async (req, res, next) => {
  try {
    res.json({ data: { success: true, note: "Token persistence is left for SMTP/KMS integration." } });
  } catch (e) { next(e); }
});

/** Any authenticated panel user — verify current password against bcrypt, then rotate hash. */
router.post("/change-password", authJwt(), validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (currentPassword === newPassword) {
      throw new AppError(400, "SAME_PASSWORD", "New password must be different from current password");
    }
    const user = await User.findById(req.user.sub);
    if (!user || !user.isActive) throw new AppError(401, "UNAUTHORIZED", "User not found");
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new AppError(401, "INVALID_PASSWORD", "Current password is incorrect");
    user.passwordHash = await hashPassword(newPassword);
    user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
    await user.save();
    return res.json({ data: { success: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
