import type { Request, Response } from "express";
import { openSessionSchema, cashMovementSchema, closeSessionSchema } from "./cash.schemas.js";
import * as cashService from "./cash.service.js";

function actorFrom(req: Request) {
  return {
    userId: req.auth!.userId,
    role: req.auth!.role,
    storeId: req.auth!.storeId,
    ipAddress: req.ip,
  };
}

export async function getCurrentSessionHandler(req: Request, res: Response) {
  const session = await cashService.getCurrentSession(req.auth!.tenantId, req.auth!.storeId);
  res.json({ session });
}

export async function openSessionHandler(req: Request, res: Response) {
  const { openingAmount } = openSessionSchema.parse(req.body);
  const session = await cashService.openSession(req.auth!.tenantId, actorFrom(req), openingAmount);
  res.status(201).json({ session });
}

export async function getSessionHandler(req: Request, res: Response) {
  const session = await cashService.getSession(req.auth!.tenantId, req.params.id);
  res.json({ session });
}

export async function addMovementHandler(req: Request, res: Response) {
  const input = cashMovementSchema.parse(req.body);
  const movement = await cashService.addMovement(req.auth!.tenantId, req.params.id, actorFrom(req), input);
  res.status(201).json({ movement });
}

export async function closeSessionHandler(req: Request, res: Response) {
  const { countedCash, justification } = closeSessionSchema.parse(req.body);
  const session = await cashService.closeSession(req.auth!.tenantId, req.params.id, actorFrom(req), {
    countedCash,
    justification,
  });
  res.json({ session });
}
