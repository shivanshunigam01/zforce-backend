import { z } from "zod";

export const loginSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(6)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  panel: z.enum(["admin", "dealer", "distributor"])
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8)
});

/** Logged-in user changes own password (Bearer JWT). */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

/** HO staff changes dealer/distributor panel password (Mongo `userId` = panel login id). */
export const panelAccountPasswordChangeSchema = z.object({
  userId: z.string().min(1),
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

export const panelAccountEnabledSchema = z.object({
  enabled: z.boolean()
});
