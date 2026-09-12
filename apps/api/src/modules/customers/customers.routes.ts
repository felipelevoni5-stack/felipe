import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as customersController from "./customers.controller.js";

export const customersRouter = Router();

customersRouter.use(authenticate);

customersRouter.get("/", asyncHandler(customersController.listCustomersHandler));
customersRouter.post("/", asyncHandler(customersController.createCustomerHandler));
customersRouter.get("/:id", asyncHandler(customersController.getCustomerHandler));
customersRouter.patch("/:id", asyncHandler(customersController.updateCustomerHandler));
customersRouter.get(
  "/:id/history",
  requireRole("ADMIN", "GERENTE"),
  asyncHandler(customersController.getCustomerHistoryHandler),
);
