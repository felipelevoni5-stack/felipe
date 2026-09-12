import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordAudit } from "../../lib/audit.js";
import { getCurrentSession } from "../cash/cash.service.js";
import { updateTenantSchema } from "./tenant.schemas.js";

export const tenantRouter = Router();

tenantRouter.use(authenticate);

tenantRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.auth!.tenantId },
      include: { stores: true },
    });
    if (!tenant) {
      throw new HttpError(404, "Empresa não encontrada.");
    }
    res.json({ tenant });
  }),
);

// Configurações da empresa: só ADMIN pode alterar (dados cadastrais, política de
// estoque negativo e limite de desconto do operador).
tenantRouter.patch(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = updateTenantSchema.parse(req.body);
    const tenant = await prisma.tenant.update({
      where: { id: req.auth!.tenantId },
      data: input,
      include: { stores: true },
    });

    await recordAudit({
      tenantId: req.auth!.tenantId,
      userId: req.auth!.userId,
      action: "TENANT_SETTINGS_UPDATED",
      entity: "Tenant",
      entityId: tenant.id,
      metadata: input,
      ipAddress: req.ip,
    });

    res.json({ tenant });
  }),
);

// Estatísticas reais da Visão Geral — nunca números inventados para módulo que não existe.
tenantRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [userCount, storeCount, activeProducts, salesToday, cashSession] = await Promise.all([
      prisma.user.count({ where: { tenantId, active: true } }),
      prisma.store.count({ where: { tenantId, active: true } }),
      prisma.product.findMany({
        where: { tenantId, active: true },
        select: { stockQuantity: true, minStock: true },
      }),
      prisma.sale.findMany({
        where: { tenantId, status: "CONCLUIDA", createdAt: { gte: startOfToday } },
        select: { total: true },
      }),
      getCurrentSession(tenantId, req.auth!.storeId),
    ]);
    const lowStockCount = activeProducts.filter((p) =>
      p.stockQuantity.lessThanOrEqualTo(p.minStock),
    ).length;
    const revenueToday = salesToday.reduce((acc, s) => acc + s.total.toNumber(), 0);

    res.json({
      overview: {
        userCount,
        storeCount,
        productCount: activeProducts.length,
        lowStockCount,
        salesTodayCount: salesToday.length,
        revenueToday,
        cashRegisterOpen: !!cashSession,
      },
    });
  }),
);
