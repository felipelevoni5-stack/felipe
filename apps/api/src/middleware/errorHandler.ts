import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Handler central de erros: nunca vaza stack trace ou detalhes internos para o cliente.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error(err);
  const body: { error: string; message?: string } = {
    error: "Erro interno do servidor.",
  };
  if (env.nodeEnv !== "production" && err instanceof Error) {
    body.message = err.message;
  }
  return res.status(500).json(body);
}
