import { Prisma, type PaymentMethod } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

function dateFilter(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (from) filter.gte = from;
  if (to) filter.lte = to;
  return filter;
}

export async function getSalesSummary(
  tenantId: string,
  filters: { from?: Date; to?: Date; userId?: string },
) {
  const createdAt = dateFilter(filters.from, filters.to);
  const base: Prisma.SaleWhereInput = { tenantId, ...(createdAt ? { createdAt } : {}) };
  if (filters.userId) base.userId = filters.userId;

  const [concluded, cancelled] = await Promise.all([
    prisma.sale.findMany({ where: { ...base, status: "CONCLUIDA" }, select: { total: true } }),
    prisma.sale.findMany({ where: { ...base, status: "CANCELADA" }, select: { total: true } }),
  ]);

  const totalVendido = concluded.reduce((acc, s) => acc.plus(s.total), D(0));
  const quantidadeVendas = concluded.length;
  const ticketMedio = quantidadeVendas > 0 ? totalVendido.dividedBy(quantidadeVendas) : D(0);
  const totalCancelado = cancelled.reduce((acc, s) => acc.plus(s.total), D(0));

  return {
    totalVendido: totalVendido.toString(),
    quantidadeVendas,
    ticketMedio: ticketMedio.toString(),
    vendasCanceladas: cancelled.length,
    totalCancelado: totalCancelado.toString(),
  };
}

export async function getTopProducts(
  tenantId: string,
  filters: { from?: Date; to?: Date; categoryId?: string; limit: number },
) {
  const createdAt = dateFilter(filters.from, filters.to);
  const items = await prisma.saleItem.findMany({
    where: {
      sale: { tenantId, status: "CONCLUIDA", ...(createdAt ? { createdAt } : {}) },
      ...(filters.categoryId ? { product: { categoryId: filters.categoryId } } : {}),
    },
    select: { productId: true, productName: true, quantity: true, subtotal: true },
  });

  const byProduct = new Map<string, { productId: string; name: string; quantity: Prisma.Decimal; revenue: Prisma.Decimal }>();
  for (const item of items) {
    const entry = byProduct.get(item.productId) ?? {
      productId: item.productId,
      name: item.productName,
      quantity: D(0),
      revenue: D(0),
    };
    entry.quantity = entry.quantity.plus(item.quantity);
    entry.revenue = entry.revenue.plus(item.subtotal);
    byProduct.set(item.productId, entry);
  }

  return [...byProduct.values()]
    .sort((a, b) => b.quantity.comparedTo(a.quantity))
    .slice(0, filters.limit)
    .map((e) => ({ productId: e.productId, name: e.name, quantity: e.quantity.toString(), revenue: e.revenue.toString() }));
}

export async function getPaymentsReport(tenantId: string, filters: { from?: Date; to?: Date }) {
  const createdAt = dateFilter(filters.from, filters.to);

  const payments = await prisma.payment.findMany({
    where: { sale: { tenantId, status: "CONCLUIDA", ...(createdAt ? { createdAt } : {}) } },
    select: { method: true, amount: true },
  });
  const totals: Record<PaymentMethod, Prisma.Decimal> = {
    DINHEIRO: D(0),
    PIX: D(0),
    DEBITO: D(0),
    CREDITO: D(0),
    OUTRO: D(0),
  };
  for (const p of payments) totals[p.method] = totals[p.method].plus(p.amount);

  const movements = await prisma.cashMovement.findMany({
    where: { tenantId, ...(createdAt ? { createdAt } : {}) },
    select: { type: true, amount: true },
  });
  const totalSuprimentos = movements
    .filter((m) => m.type === "SUPRIMENTO")
    .reduce((acc, m) => acc.plus(m.amount), D(0));
  const totalSangrias = movements
    .filter((m) => m.type === "SANGRIA")
    .reduce((acc, m) => acc.plus(m.amount), D(0));

  const closedSessions = await prisma.cashSession.findMany({
    where: { tenantId, status: "FECHADO", ...(createdAt ? { closedAt: createdAt } : {}) },
    orderBy: { closedAt: "desc" },
    select: {
      id: true,
      openedAt: true,
      closedAt: true,
      openingAmount: true,
      expectedCash: true,
      countedCash: true,
      difference: true,
      closingJustification: true,
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });

  return {
    totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.toString()])) as Record<
      PaymentMethod,
      string
    >,
    totalSuprimentos: totalSuprimentos.toString(),
    totalSangrias: totalSangrias.toString(),
    fechamentos: closedSessions.map((s) => ({
      id: s.id,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      openingAmount: s.openingAmount.toString(),
      expectedCash: s.expectedCash?.toString() ?? null,
      countedCash: s.countedCash?.toString() ?? null,
      difference: s.difference?.toString() ?? null,
      closingJustification: s.closingJustification,
      openedBy: s.openedBy.name,
      closedBy: s.closedBy?.name ?? null,
    })),
  };
}

export async function getStockReport(tenantId: string) {
  const products = await prisma.product.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true, stockQuantity: true, minStock: true, costPrice: true, salePrice: true, unit: true },
  });

  const lowStock = products.filter(
    (p) => p.stockQuantity.greaterThan(0) && p.stockQuantity.lessThanOrEqualTo(p.minStock),
  );
  const outOfStock = products.filter((p) => p.stockQuantity.lessThanOrEqualTo(0));
  const stockValueCost = products.reduce((acc, p) => acc.plus(p.costPrice.times(p.stockQuantity)), D(0));
  const stockValueSale = products.reduce((acc, p) => acc.plus(p.salePrice.times(p.stockQuantity)), D(0));

  const serialize = (p: (typeof products)[number]) => ({
    id: p.id,
    name: p.name,
    stockQuantity: p.stockQuantity.toString(),
    minStock: p.minStock.toString(),
    unit: p.unit,
  });

  return {
    totalActiveProducts: products.length,
    lowStock: lowStock.map(serialize),
    outOfStock: outOfStock.map(serialize),
    stockValueCost: stockValueCost.toString(),
    stockValueSale: stockValueSale.toString(),
  };
}
