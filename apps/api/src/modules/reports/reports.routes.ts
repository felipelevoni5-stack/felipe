import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as reportsController from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.use(requireRole("ADMIN", "GERENTE"));

reportsRouter.get("/sales-summary", asyncHandler(reportsController.salesSummaryHandler));
reportsRouter.get("/top-products", asyncHandler(reportsController.topProductsHandler));
reportsRouter.get("/payments", asyncHandler(reportsController.paymentsReportHandler));
reportsRouter.get("/stock", asyncHandler(reportsController.stockReportHandler));
