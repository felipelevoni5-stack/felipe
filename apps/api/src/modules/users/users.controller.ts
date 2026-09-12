import type { Request, Response } from "express";
import { createUserSchema, updateUserSchema } from "./users.schemas.js";
import * as usersService from "./users.service.js";

export async function listUsersHandler(req: Request, res: Response) {
  const users = await usersService.listUsers(req.auth!.tenantId);
  res.json({ users });
}

export async function createUserHandler(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  const user = await usersService.createUser(req.auth!.tenantId, input, {
    userId: req.auth!.userId,
    ipAddress: req.ip,
  });
  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      storeId: user.storeId,
    },
  });
}

export async function updateUserHandler(req: Request, res: Response) {
  const input = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(req.auth!.tenantId, req.params.id, input, {
    userId: req.auth!.userId,
    ipAddress: req.ip,
  });
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      storeId: user.storeId,
    },
  });
}
