import { z } from "zod";

export const cibilOrderSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  pan: z.string().min(10).max(10),
  consent: z.literal(true)
});

export const cibilConfirmSchema = z.object({
  cibilDraftId: z.string().min(8),
  razorpay_order_id: z.string().min(8),
  razorpay_payment_id: z.string().min(8),
  razorpay_signature: z.string().min(8)
});

export const cibilFormSchema = z.object({
  cibilDraftId: z.string().min(8)
});

export const enquirySchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  district: z.string().optional(),
  message: z.string().optional()
});

export const financeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  district: z.string().optional(),
  model: z.string().optional(),
  income: z.string().optional(),
  draftId: z.string().optional(),
  step: z.number().optional(),
  payload: z.record(z.any()).optional()
});

export const contactSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  message: z.string().min(2)
});

export const dealerApplicationSchema = z.object({
  companyName: z.string().min(2),
  ownerName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  district: z.string().optional(),
  payload: z.record(z.any()).optional()
});

export const jobApplicationSchema = z.object({
  jobPostingId: z.string().optional(),
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  resumeUrl: z.string().url().optional(),
  payload: z.record(z.any()).optional()
});
