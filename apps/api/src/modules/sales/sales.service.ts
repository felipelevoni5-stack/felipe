import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordAudit } from "../../lib/audit.js";
import { requireOpenSessionForSale } from "../cash/cash.service.js";
import type { createSaleSchema } from "./sales.schemas.js";
import type { z } from "zod";

type CreateSaleInput = z.infer<typeof createSaleSchema>;
type Actor = {
  userId: string;
  role: "ADMIN" | "GERENTE" | "OPERADOR";
  storeId: string | null;
  ipAddress?: string | null;
};

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

const saleInclude = {
  items: true,
  payments: true,
  user: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
} satisfies Prisma.SaleInclude;

export async function createSale(tenantId: string, actor: Actor, input: CreateSaleInput) {
  // Chave de idempotência: se esta requisição já foi processada (duplo clique/retry
  // de rede), devolve a venda já criada em vez de duplicar.
  if (input.clientRequestId) {
    const existing = await prisma.sale.findUnique({
      where: { tenantId_clientRequestId: { tenantId, clientRequestId: input.clientRequestId } },
      include: saleInclude,
    });
    if (existing) return existing;
  }

  const cashSession = await requireOpenSessionForSale(tenantId, actor.storeId);
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, tenantId },
    });
    if (!customer) {
      throw new HttpError(400, "Cliente informado não pertence a esta empresa.");
    }
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new HttpError(400, "Um dos produtos da venda não foi encontrado nesta empresa.");
    }
    if (!product.active) {
      throw new HttpError(400, `Produto "${product.name}" está inativo e não pode ser vendido.`);
    }
  }

  // Quantidade total pedida por produto (protege contra linhas duplicadas do mesmo produto).
  const quantityByProduct = new Map<string, Prisma.Decimal>();
  for (const item of input.items) {
    const current = quantityByProduct.get(item.productId) ?? D(0);
    quantityByProduct.set(item.productId, current.plus(item.quantity));
  }
  if (!tenant.allowNegativeStock) {
    for (const [productId, qty] of quantityByProduct) {
      const product = productMap.get(productId)!;
      if (product.stockQuantity.lessThan(qty)) {
        throw new HttpError(
          400,
          `Estoque insuficiente para "${product.name}" (disponível: ${product.stockQuantity.toString()}). Esta empresa não permite estoque negativo.`,
        );
      }
    }
  }

  let subtotal = D(0);
  let itemDiscountTotal = D(0);
  const lineItems = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = product.salePrice;
    const gross = unitPrice.times(item.quantity);
    const discount = D(item.discount);
    if (discount.greaterThan(gross)) {
      throw new HttpError(400, `Desconto do item "${product.name}" não pode ser maior que o valor do item.`);
    }
    const lineSubtotal = gross.minus(discount);
    subtotal = subtotal.plus(gross);
    itemDiscountTotal = itemDiscountTotal.plus(discount);
    return { product, unitPrice, quantity: D(item.quantity), discount, lineSubtotal };
  });

  const saleDiscount = D(input.discountTotal);
  const discountTotal = itemDiscountTotal.plus(saleDiscount);
  if (discountTotal.greaterThan(subtotal)) {
    throw new HttpError(400, "O desconto total não pode ser maior que o subtotal da venda.");
  }
  const total = subtotal.minus(discountTotal);

  if (actor.role === "OPERADOR" && subtotal.greaterThan(0)) {
    const discountPercent = discountTotal.dividedBy(subtotal).times(100);
    if (discountPercent.greaterThan(tenant.operatorMaxDiscountPercent)) {
      throw new HttpError(
        403,
        `Desconto acima do limite permitido para operadores (máx. ${tenant.operatorMaxDiscountPercent.toString()}%).`,
      );
    }
  }

  const nonCashTotal = input.payments
    .filter((p) => p.method !== "DINHEIRO")
    .reduce((acc, p) => acc.plus(p.amount), D(0));
  const cashTotal = input.payments
    .filter((p) => p.method === "DINHEIRO")
    .reduce((acc, p) => acc.plus(p.amount), D(0));

  if (nonCashTotal.greaterThan(total)) {
    throw new HttpError(
      400,
      "O valor pago em Pix/débito/crédito/outro não pode ultrapassar o total da venda — esses meios não dão troco.",
    );
  }
  const remainingForCash = total.minus(nonCashTotal);
  if (cashTotal.lessThan(remainingForCash)) {
    throw new HttpError(400, "Valor recebido é insuficiente para cobrir o total da venda.");
  }
  const changeAmount = cashTotal.minus(remainingForCash);
  const amountPaid = nonCashTotal.plus(cashTotal);

  const runSaleTransaction = () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          tenantId,
          storeId: cashSession.storeId,
          cashSessionId: cashSession.id,
          customerId: input.customerId,
          userId: actor.userId,
          subtotal,
          discountTotal,
          total,
          amountPaid,
          changeAmount,
          clientRequestId: input.clientRequestId,
          items: {
            create: lineItems.map((line) => ({
              productId: line.product.id,
              productName: line.product.name,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              discount: line.discount,
              subtotal: line.lineSubtotal,
            })),
          },
          payments: { create: input.payments.map((p) => ({ method: p.method, amount: p.amount })) },
        },
        include: saleInclude,
      });

      for (const line of lineItems) {
        const updated = await tx.product.update({
          where: { id: line.product.id },
          data: { stockQuantity: { decrement: line.quantity.toNumber() } },
          select: { stockQuantity: true },
        });
        if (updated.stockQuantity.lessThan(0) && !tenant.allowNegativeStock) {
          throw new HttpError(
            400,
            `Estoque insuficiente para "${line.product.name}" — outra venda concorrente consumiu o saldo disponível.`,
          );
        }
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: line.product.id,
            userId: actor.userId,
            saleId: created.id,
            type: "VENDA",
            quantity: line.quantity.negated(),
            previousQuantity: updated.stockQuantity.plus(line.quantity),
            newQuantity: updated.stockQuantity,
          },
        });
      }

      return created;
    });

  let sale;
  try {
    sale = await runSaleTransaction();
  } catch (err) {
    // Corrida real de duplo clique/retry: as duas requisições passaram pela checagem
    // acima antes de qualquer uma commitar. O índice único do banco rejeita a segunda
    // criação — nesse caso devolvemos a venda que já foi criada pela primeira.
    if (
      input.clientRequestId &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.sale.findUnique({
        where: { tenantId_clientRequestId: { tenantId, clientRequestId: input.clientRequestId } },
        include: saleInclude,
      });
      if (existing) return existing;
    }
    throw err;
  }

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "SALE_CREATED",
    entity: "Sale",
    entityId: sale.id,
    metadata: { total: total.toString(), items: lineItems.length },
    ipAddress: actor.ipAddress,
  });

  return sale;
}

export async function getSale(tenantId: string, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId },
    include: saleInclude,
  });
  if (!sale) {
    throw new HttpError(404, "Venda não encontrada.");
  }
  return sale;
}

export async function cancelSale(tenantId: string, saleId: string, reason: string, actor: Actor) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId },
    include: { items: true },
  });
  if (!sale) {
    throw new HttpError(404, "Venda não encontrada.");
  }
  if (sale.status === "CANCELADA") {
    throw new HttpError(400, "Esta venda já está cancelada.");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      const updated = await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: item.quantity.toNumber() } },
        select: { stockQuantity: true },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: item.productId,
          userId: actor.userId,
          saleId: sale.id,
          type: "CANCELAMENTO",
          quantity: item.quantity,
          previousQuantity: updated.stockQuantity.minus(item.quantity),
          newQuantity: updated.stockQuantity,
          reason: `Cancelamento da venda ${sale.id}`,
        },
      });
    }

    await tx.sale.update({
      where: { id: sale.id },
      data: { status: "CANCELADA", cancelledAt: new Date(), cancelReason: reason },
    });
  });

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "SALE_CANCELLED",
    entity: "Sale",
    entityId: sale.id,
    metadata: { reason },
    ipAddress: actor.ipAddress,
  });

  return getSale(tenantId, saleId);
}
