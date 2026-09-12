import type { Request, Response } from "express";
import {
  salesReportQuerySchema,
  topProductsQuerySchema,
  paymentsReportQuerySchema,
} from "./reports.schemas.js";
import * as reportsService from "./reports.service.js";

export async function salesSummaryHandler(req: Request, res: Response) {
  const query = salesReportQuerySchema.parse(req.query);
  const summary = await reportsService.getSalesSummary(req.auth!.tenantId, query);
  res.json({ summary });
}

export async function topProductsHandler(req: Request, res: Response) {
  const query = topProductsQuerySchema.parse(req.query);
  const products = await reportsService.getTopProducts(req.auth!.tenantId, query);
  res.json({ products });
}

export async function paymentsReportHandler(req: Request, res: Response) {
  const query = paymentsReportQuerySchema.parse(req.query);
  const report = await reportsService.getPaymentsReport(req.auth!.tenantId, query);
  res.json({ report });
}

export async function stockReportHandler(req: Request, res: Response) {
  const report = await reportsService.getStockReport(req.auth!.tenantId);
  res.json({ report });
}
