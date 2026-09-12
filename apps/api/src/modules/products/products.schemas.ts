import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do produto."),
  sku: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  barcode: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  categoryId: z.preprocess(emptyToUndefined, z.string().optional()),
  brand: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  costPrice: z.coerce.number().min(0, "Preço de custo inválido."),
  salePrice: z.coerce.number().positive("Informe um preço de venda válido."),
  stockQuantity: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().min(0).default(0),
  unit: z.string().trim().min(1).default("UN"),
  supplierName: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  imageUrl: z.preprocess(emptyToUndefined, z.string().trim().url().optional()),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).optional(),
  sku: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional().nullable()),
  barcode: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional().nullable()),
  categoryId: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  brand: z.preprocess(emptyToUndefined, z.string().trim().optional().nullable()),
  description: z.preprocess(emptyToUndefined, z.string().trim().optional().nullable()),
  costPrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().positive().optional(),
  minStock: z.coerce.number().min(0).optional(),
  unit: z.string().trim().min(1).optional(),
  supplierName: z.preprocess(emptyToUndefined, z.string().trim().optional().nullable()),
  imageUrl: z.preprocess(emptyToUndefined, z.string().trim().url().optional().nullable()),
  active: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["ativos", "inativos", "todos"]).default("ativos"),
  lowStock: z.coerce.boolean().optional(),
});
