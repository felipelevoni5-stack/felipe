import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as productsController from "./products.controller.js";
import * as stockController from "../stock/stock.controller.js";

export const productsRouter = Router();

productsRouter.use(authenticate);

productsRouter.get("/", asyncHandler(productsController.listProductsHandler));
productsRouter.get("/lookup", asyncHandler(productsController.lookupProductHandler));
productsRouter.get("/:id", asyncHandler(productsController.getProductHandler));
productsRouter.post(
  "/",
  requireRole("ADMIN", "GERENTE"),
  asyncHandler(productsController.createProductHandler),
);
productsRouter.patch(
  "/:id",
  requireRole("ADMIN", "GERENTE"),
  asyncHandler(productsController.updateProductHandler),
);

productsRouter.get("/:id/stock-movements", asyncHandler(stockController.listStockMovementsHandler));
productsRouter.post(
  "/:id/stock-movements",
  requireRole("ADMIN", "GERENTE"),
  asyncHandler(stockController.createStockMovementHandler),
);
