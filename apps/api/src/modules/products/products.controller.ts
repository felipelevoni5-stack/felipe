import type { Request, Response } from "express";
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from "./products.schemas.js";
import * as productsService from "./products.service.js";

export async function listProductsHandler(req: Request, res: Response) {
  const query = listProductsQuerySchema.parse(req.query);
  const products = await productsService.listProducts(req.auth!.tenantId, query);
  res.json({ products });
}

export async function lookupProductHandler(req: Request, res: Response) {
  const code = String(req.query.code ?? "").trim();
  if (!code) {
    return res.status(400).json({ error: "Informe o código de barras ou SKU." });
  }
  const product = await productsService.lookupProductByCode(req.auth!.tenantId, code);
  res.json({ product });
}

export async function getProductHandler(req: Request, res: Response) {
  const product = await productsService.getProduct(req.auth!.tenantId, req.params.id);
  res.json({ product });
}

export async function createProductHandler(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body);
  const product = await productsService.createProduct(req.auth!.tenantId, input, {
    userId: req.auth!.userId,
    ipAddress: req.ip,
  });
  res.status(201).json({ product });
}

export async function updateProductHandler(req: Request, res: Response) {
  const input = updateProductSchema.parse(req.body);
  const product = await productsService.updateProduct(req.auth!.tenantId, req.params.id, input, {
    userId: req.auth!.userId,
    ipAddress: req.ip,
  });
  res.json({ product });
}
