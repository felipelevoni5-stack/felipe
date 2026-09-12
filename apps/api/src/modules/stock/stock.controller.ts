import type { Request, Response } from "express";
import { createStockMovementSchema } from "./stock.schemas.js";
import * as stockService from "./stock.service.js";

export async function listStockMovementsHandler(req: Request, res: Response) {
  const movements = await stockService.listStockMovements(req.auth!.tenantId, req.params.id);
  res.json({ movements });
}

export async function createStockMovementHandler(req: Request, res: Response) {
  const input = createStockMovementSchema.parse(req.body);
  const movement = await stockService.createStockMovement(req.auth!.tenantId, req.params.id, input, {
    userId: req.auth!.userId,
    ipAddress: req.ip,
  });
  res.status(201).json({ movement });
}
