import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

type AuditInput = {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function recordAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
