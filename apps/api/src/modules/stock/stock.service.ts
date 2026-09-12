import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordAudit } from "../../lib/audit.js";

type CreateMovementInput = {
  type: "ENTRADA" | "SAIDA" | "AJUSTE" | "INVENTARIO";
  quantity?: number;
  newQuantity?: number;
  reason?: string;
};

export async function listStockMovements(tenantId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) {
    throw new HttpError(404, "Produto não encontrado.");
  }
  return prisma.stockMovement.findMany({
    where: { tenantId, productId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStockMovement(
  tenantId: string,
  productId: string,
  input: CreateMovementInput,
  actor: { userId: string; ipAddress?: string | null },
) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) {
    throw new HttpError(404, "Produto não encontrado.");
  }

  const previousQuantity = product.stockQuantity;
  let newQuantity: Prisma.Decimal;
  let delta: Prisma.Decimal;

  if (input.type === "ENTRADA") {
    delta = new Prisma.Decimal(input.quantity!);
    newQuantity = previousQuantity.plus(delta);
  } else if (input.type === "SAIDA") {
    delta = new Prisma.Decimal(input.quantity!).negated();
    newQuantity = previousQuantity.plus(delta);
  } else {
    // AJUSTE ou INVENTARIO: o usuário informa a quantidade correta contada.
    newQuantity = new Prisma.Decimal(input.newQuantity!);
    delta = newQuantity.minus(previousQuantity);
  }

  if (newQuantity.lessThan(0)) {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    if (!tenant.allowNegativeStock) {
      throw new HttpError(
        400,
        "Estoque insuficiente para esta saída. Esta empresa não permite estoque negativo.",
      );
    }
  }

  const [, movement] = await prisma.$transaction([
    prisma.product.update({ where: { id: product.id }, data: { stockQuantity: newQuantity } }),
    prisma.stockMovement.create({
      data: {
        tenantId,
        productId: product.id,
        userId: actor.userId,
        type: input.type,
        quantity: delta,
        previousQuantity,
        newQuantity,
        reason: input.reason,
      },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: `STOCK_${input.type}`,
    entity: "Product",
    entityId: product.id,
    metadata: {
      previousQuantity: previousQuantity.toString(),
      newQuantity: newQuantity.toString(),
      reason: input.reason ?? null,
    },
    ipAddress: actor.ipAddress,
  });

  return movement;
}
