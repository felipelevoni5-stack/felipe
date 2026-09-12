import { z } from "zod";

export const salesReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  userId: z.string().optional(),
});

export const topProductsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  categoryId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const paymentsReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
