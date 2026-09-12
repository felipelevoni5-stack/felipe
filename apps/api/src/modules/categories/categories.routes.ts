import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as categoriesController from "./categories.controller.js";

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get("/", asyncHandler(categoriesController.listCategoriesHandler));
categoriesRouter.post(
  "/",
  requireRole("ADMIN", "GERENTE"),
  asyncHandler(categoriesController.createCategoryHandler),
);
categoriesRouter.patch(
  "/:id",
  requireRole("ADMIN", "GERENTE"),
  asyncHandler(categoriesController.updateCategoryHandler),
);
