import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  role: z.enum(["ADMIN", "GERENTE", "OPERADOR"]).default("OPERADOR"),
  storeId: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(["ADMIN", "GERENTE", "OPERADOR"]).optional(),
  active: z.boolean().optional(),
  storeId: z.string().nullable().optional(),
});
