import type { Request, Response } from "express";
import { createCategorySchema, updateCategorySchema } from "./categories.schemas.js";
import * as categoriesService from "./categories.service.js";

export async function listCategoriesHandler(req: Request, res: Response) {
  const categories = await categoriesService.listCategories(req.auth!.tenantId);
  res.json({ categories });
}

export async function createCategoryHandler(req: Request, res: Response) {
  const { name } = createCategorySchema.parse(req.body);
  const category = await categoriesService.createCategory(req.auth!.tenantId, name);
  res.status(201).json({ category });
}

export async function updateCategoryHandler(req: Request, res: Response) {
  const input = updateCategorySchema.parse(req.body);
  const category = await categoriesService.updateCategory(
    req.auth!.tenantId,
    req.params.id,
    input,
  );
  res.json({ category });
}
