import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente."),
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  email: z.preprocess(emptyToUndefined, z.string().trim().email("E-mail inválido.").optional()),
  document: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional().nullable()),
  email: z.preprocess(emptyToUndefined, z.string().trim().email().optional().nullable()),
  document: z.preprocess(emptyToUndefined, z.string().trim().optional().nullable()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().optional().nullable()),
  active: z.boolean().optional(),
});

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["ativos", "inativos", "todos"]).default("ativos"),
});
