import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
