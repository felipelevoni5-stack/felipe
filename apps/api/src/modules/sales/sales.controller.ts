import type { Request, Response } from "express";
import { createSaleSchema, cancelSaleSchema } from "./sales.schemas.js";
import * as salesService from "./sales.service.js";

export async function createSaleHandler(req: Request, res: Response) {
  const input = createSaleSchema.parse(req.body);
  const sale = await salesService.createSale(
    req.auth!.tenantId,
    { userId: req.auth!.userId, role: req.auth!.role, storeId: req.auth!.storeId, ipAddress: req.ip },
    input,
  );
  res.status(201).json({ sale });
}

export async function getSaleHandler(req: Request, res: Response) {
  const sale = await salesService.getSale(req.auth!.tenantId, req.params.id);
  res.json({ sale });
}

export async function cancelSaleHandler(req: Request, res: Response) {
  const { reason } = cancelSaleSchema.parse(req.body);
  const sale = await salesService.cancelSale(req.auth!.tenantId, req.params.id, reason, {
    userId: req.auth!.userId,
    role: req.auth!.role,
    storeId: req.auth!.storeId,
    ipAddress: req.ip,
  });
  res.json({ sale });
}
