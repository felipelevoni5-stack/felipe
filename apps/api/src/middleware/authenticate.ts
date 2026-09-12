import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        tenantId: string;
        storeId: string | null;
        role: "ADMIN" | "GERENTE" | "OPERADOR";
      };
    }
  }
}

// Extrai e valida o JWT de acesso. tenantId/role vêm SOMENTE do token assinado pelo
// backend — nunca de header, query ou body enviado pelo cliente.
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      storeId: payload.storeId,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}
