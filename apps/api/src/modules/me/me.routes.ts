import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { authenticate } from "../../middleware/authenticate.js";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export const meRouter = Router();

meRouter.use(authenticate);

meRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: { id: req.auth!.userId, tenantId: req.auth!.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        storeId: true,
      },
    });
    if (!user) {
      throw new HttpError(404, "Usuário não encontrado.");
    }
    res.json({ user });
  }),
);
