import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import * as cashController from "./cash.controller.js";

export const cashRouter = Router();

cashRouter.use(authenticate);

cashRouter.get("/sessions/current", asyncHandler(cashController.getCurrentSessionHandler));
cashRouter.post("/sessions", asyncHandler(cashController.openSessionHandler));
cashRouter.get("/sessions/:id", asyncHandler(cashController.getSessionHandler));
cashRouter.post("/sessions/:id/movements", asyncHandler(cashController.addMovementHandler));
cashRouter.post("/sessions/:id/close", asyncHandler(cashController.closeSessionHandler));
