import type { Request, Response } from "express";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from "./customers.schemas.js";
import * as customersService from "./customers.service.js";

export async function listCustomersHandler(req: Request, res: Response) {
  const query = listCustomersQuerySchema.parse(req.query);
  const customers = await customersService.listCustomers(req.auth!.tenantId, query);
  res.json({ customers });
}

export async function getCustomerHandler(req: Request, res: Response) {
  const customer = await customersService.getCustomer(req.auth!.tenantId, req.params.id);
  res.json({ customer });
}

export async function createCustomerHandler(req: Request, res: Response) {
  const input = createCustomerSchema.parse(req.body);
  const customer = await customersService.createCustomer(req.auth!.tenantId, input, {
    userId: req.auth!.userId,
    ipAddress: req.ip,
  });
  res.status(201).json({ customer });
}

export async function updateCustomerHandler(req: Request, res: Response) {
  const input = updateCustomerSchema.parse(req.body);
  const customer = await customersService.updateCustomer(req.auth!.tenantId, req.params.id, input, {
    userId: req.auth!.userId,
    ipAddress: req.ip,
  });
  res.json({ customer });
}

export async function getCustomerHistoryHandler(req: Request, res: Response) {
  const sales = await customersService.getCustomerPurchaseHistory(req.auth!.tenantId, req.params.id);
  res.json({ sales });
}
