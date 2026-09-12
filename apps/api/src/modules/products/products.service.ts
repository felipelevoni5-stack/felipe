import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordAudit } from "../../lib/audit.js";
import type { createProductSchema, updateProductSchema } from "./products.schemas.js";
import type { z } from "zod";

type CreateProductInput = z.infer<typeof createProductSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;
type Actor = { userId: string; ipAddress?: string | null };

export type StockStatus = "ZERADO" | "BAIXO" | "NORMAL";

export function stockStatus(quantity: Prisma.Decimal, minStock: Prisma.Decimal): StockStatus {
  if (quantity.lessThanOrEqualTo(0)) return "ZERADO";
  if (quantity.lessThanOrEqualTo(minStock)) return "BAIXO";
  return "NORMAL";
}

async function assertCategoryBelongsToTenant(tenantId: string, categoryId?: string | null) {
  if (!categoryId) return;
  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) {
    throw new HttpError(400, "Categoria informada não pertence a esta empresa.");
  }
}

async function assertUniqueIdentifiers(
  tenantId: string,
  input: { sku?: string | null; barcode?: string | null },
  excludeProductId?: string,
) {
  if (input.sku) {
    const existing = await prisma.product.findFirst({
      where: { tenantId, sku: input.sku, id: excludeProductId ? { not: excludeProductId } : undefined },
    });
    if (existing) throw new HttpError(409, "Já existe um produto com este SKU nesta empresa.");
  }
  if (input.barcode) {
    const existing = await prisma.product.findFirst({
      where: {
        tenantId,
        barcode: input.barcode,
        id: excludeProductId ? { not: excludeProductId } : undefined,
      },
    });
    if (existing) {
      throw new HttpError(409, "Já existe um produto com este código de barras nesta empresa.");
    }
  }
}

export async function listProducts(
  tenantId: string,
  filters: { search?: string; categoryId?: string; status: "ativos" | "inativos" | "todos"; lowStock?: boolean },
) {
  const where: Prisma.ProductWhereInput = { tenantId };

  if (filters.status === "ativos") where.active = true;
  if (filters.status === "inativos") where.active = false;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { barcode: { contains: term, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const withStatus = products.map((product) => ({
    ...product,
    status: stockStatus(product.stockQuantity, product.minStock),
  }));

  if (filters.lowStock) {
    return withStatus.filter((p) => p.status !== "NORMAL");
  }
  return withStatus;
}

// Busca exata por código de barras ou SKU — usado pelo leitor de código de barras no PDV.
export async function lookupProductByCode(tenantId: string, code: string) {
  const product = await prisma.product.findFirst({
    where: {
      tenantId,
      active: true,
      OR: [{ barcode: code }, { sku: code }],
    },
    include: { category: true },
  });
  if (!product) {
    throw new HttpError(404, "Produto não encontrado.");
  }
  return { ...product, status: stockStatus(product.stockQuantity, product.minStock) };
}

export async function getProduct(tenantId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
    include: { category: true },
  });
  if (!product) {
    throw new HttpError(404, "Produto não encontrado.");
  }
  return { ...product, status: stockStatus(product.stockQuantity, product.minStock) };
}

export async function createProduct(tenantId: string, input: CreateProductInput, actor: Actor) {
  await assertCategoryBelongsToTenant(tenantId, input.categoryId);
  await assertUniqueIdentifiers(tenantId, input);

  const product = await prisma.product.create({
    data: {
      tenantId,
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      categoryId: input.categoryId,
      brand: input.brand,
      description: input.description,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      stockQuantity: input.stockQuantity,
      minStock: input.minStock,
      unit: input.unit,
      supplierName: input.supplierName,
      imageUrl: input.imageUrl,
    },
    include: { category: true },
  });

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "PRODUCT_CREATED",
    entity: "Product",
    entityId: product.id,
    metadata: { name: product.name, salePrice: product.salePrice.toString() },
    ipAddress: actor.ipAddress,
  });

  return product;
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  input: UpdateProductInput,
  actor: Actor,
) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) {
    throw new HttpError(404, "Produto não encontrado.");
  }

  if (input.categoryId !== undefined) {
    await assertCategoryBelongsToTenant(tenantId, input.categoryId);
  }
  await assertUniqueIdentifiers(tenantId, input, productId);

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: input,
    include: { category: true },
  });

  // Alteração de preço é uma operação sensível — sempre auditada, com o valor anterior.
  const priceChanged =
    input.salePrice !== undefined && !product.salePrice.equals(updated.salePrice);
  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: priceChanged ? "PRODUCT_PRICE_CHANGED" : "PRODUCT_UPDATED",
    entity: "Product",
    entityId: updated.id,
    metadata: priceChanged
      ? { previousSalePrice: product.salePrice.toString(), newSalePrice: updated.salePrice.toString() }
      : input,
    ipAddress: actor.ipAddress,
  });

  return updated;
}
