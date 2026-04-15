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
