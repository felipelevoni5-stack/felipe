export type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
};
