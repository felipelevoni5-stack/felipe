import express, { type RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createRequire } from "node:module";
import { env } from "./config/env.js";

// Import via createRequire em vez de `import helmet from "helmet"`: em alguns ambientes
// de build (observado no Vercel), o TypeScript resolve o tipo do módulo CJS do helmet
// como não-chamável, mesmo com esModuleInterop ativado. Isso contorna a checagem de
// tipos do import problemático sem afetar o comportamento em tempo de execução.
const require = createRequire(import.meta.url);
const helmet = require("helmet") as (options?: Record<string, unknown>) => RequestHandler;
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { meRouter } from "./modules/me/me.routes.js";
import { tenantRouter } from "./modules/tenant/tenant.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { salesRouter } from "./modules/sales/sales.routes.js";
import { cashRouter } from "./modules/cash/cash.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { auditLogsRouter } from "./modules/audit-logs/audit-logs.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  // API pura consumida por um frontend em outra origem — sem necessidade de CSP para
  // páginas renderizadas no servidor; os demais cabeçalhos do helmet (HSTS, nosniff,
  // no-referrer etc.) continuam valendo.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/me", meRouter);
  app.use("/api/tenant", tenantRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/cash", cashRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/audit-logs", auditLogsRouter);

  app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

  app.use(errorHandler);

  return app;
}
