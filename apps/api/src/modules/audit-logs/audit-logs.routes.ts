import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as auditLogsController from "./audit-logs.controller.js";

export const auditLogsRouter = Router();

auditLogsRouter.use(authenticate);
auditLogsRouter.use(requireRole("ADMIN"));

auditLogsRouter.get("/", asyncHandler(auditLogsController.listAuditLogsHandler));
