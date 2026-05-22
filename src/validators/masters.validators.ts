import { z } from "zod";

const masterTypeEnum = z.enum([
  "branches",
  "models",
  "variants",
  "colors",
  "areas",
  "paymentModes",
  "financeCompanies",
  "parts",
  "labourCharges",
  "expenseHeads",
  "vendors",
  "dse",
]);

export const mastersListQuerySchema = z.object({
  type: masterTypeEnum,
  dealerId: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export const createMasterSchema = z.object({
  type: masterTypeEnum,
  name: z.string().min(1),
  code: z.string().optional().default(""),
  status: z.enum(["Active", "Inactive"]).optional().default("Active"),
  extra: z.record(z.string()).optional().default({}),
});

export const updateMasterSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
  extra: z.record(z.string()).optional(),
});
