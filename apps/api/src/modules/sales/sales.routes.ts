import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as salesController from "./sales.controller.js";

export const salesRouter = Router();

salesRouter.use(authenticate);

salesRouter.post("/", asyncHandler(salesController.createSaleHandler));
salesRouter.get("/:id", asyncHandler(salesController.getSaleHandler));
salesRouter.post(
  "/:id/cancel",
  requireRole("ADMIN", "GERENTE"),
  asyncHandler(salesController.cancelSaleHandler),
);
