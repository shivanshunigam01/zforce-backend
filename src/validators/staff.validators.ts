import { z } from "zod";

export const createStaffSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(1),
  email: z.string().optional().default(""),
  role: z.string().min(1),
  department: z.string().optional().default(""),
  branch: z.string().optional().default(""),
  reportingTo: z.string().optional().default("-"),
  status: z.enum(["Active", "Inactive"]).optional().default("Active"),
  portalUsername: z.string().optional().default(""),
  password: z.string().optional().default(""),
});

export const updateStaffSchema = createStaffSchema.partial();
