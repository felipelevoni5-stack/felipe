import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listCategories(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(tenantId: string, name: string) {
  const existing = await prisma.category.findFirst({ where: { tenantId, name } });
  if (existing) {
    throw new HttpError(409, "Já existe uma categoria com este nome.");
  }
  return prisma.category.create({ data: { tenantId, name } });
}

export async function updateCategory(
  tenantId: string,
  categoryId: string,
  input: { name?: string; active?: boolean },
) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) {
    throw new HttpError(404, "Categoria não encontrada.");
  }

  if (input.name && input.name !== category.name) {
    const existing = await prisma.category.findFirst({
      where: { tenantId, name: input.name, id: { not: categoryId } },
    });
    if (existing) {
      throw new HttpError(409, "Já existe uma categoria com este nome.");
    }
  }

  return prisma.category.update({ where: { id: category.id }, data: input });
}
