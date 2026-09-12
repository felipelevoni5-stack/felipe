import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as usersController from "./users.controller.js";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/", asyncHandler(usersController.listUsersHandler));
usersRouter.post("/", requireRole("ADMIN"), asyncHandler(usersController.createUserHandler));
usersRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(usersController.updateUserHandler),
);
