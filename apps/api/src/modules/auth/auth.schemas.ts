import { z } from "zod";

export const signupEmpresaSchema = z.object({
  empresaNome: z.string().trim().min(2, "Informe o nome da empresa."),
  lojaNome: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().min(2, "Informe o nome da loja.").optional(),
  ),
  adminNome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token obrigatório."),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});
