import type { NextFunction, Request, Response } from "express";

export function requireRole(...roles: Array<"ADMIN" | "GERENTE" | "OPERADOR">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Você não tem permissão para esta ação." });
    }
    next();
  };
}
