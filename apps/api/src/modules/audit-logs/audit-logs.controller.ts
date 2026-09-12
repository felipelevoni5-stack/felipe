import type { Request, Response } from "express";
import { listAuditLogsQuerySchema } from "./audit-logs.schemas.js";
import * as auditLogsService from "./audit-logs.service.js";

export async function listAuditLogsHandler(req: Request, res: Response) {
  const query = listAuditLogsQuerySchema.parse(req.query);
  const logs = await auditLogsService.listAuditLogs(req.auth!.tenantId, query);
  res.json({ logs });
}
