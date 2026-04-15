import { z } from "zod";
export const idParamSchema = z.object({ id: z.string().min(1) });
export const slugParamSchema = z.object({ slugOrId: z.string().min(1) });
export const tenantParamSchema = z.object({ tenantId: z.string().min(1) });
