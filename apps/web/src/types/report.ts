export type SalesSummary = {
  totalVendido: string;
  quantidadeVendas: number;
  ticketMedio: string;
  vendasCanceladas: number;
  totalCancelado: string;
};

export type TopProduct = {
  productId: string;
  name: string;
  quantity: string;
  revenue: string;
};

export type PaymentMethodTotals = {
  DINHEIRO: string;
  PIX: string;
  DEBITO: string;
  CREDITO: string;
  OUTRO: string;
};

export type CashClosingSummary = {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: string;
  expectedCash: string | null;
  countedCash: string | null;
  difference: string | null;
  closingJustification: string | null;
  openedBy: string;
  closedBy: string | null;
};

export type PaymentsReport = {
  totals: PaymentMethodTotals;
  totalSuprimentos: string;
  totalSangrias: string;
  fechamentos: CashClosingSummary[];
};

export type StockProductSummary = {
  id: string;
  name: string;
  stockQuantity: string;
  minStock: string;
  unit: string;
};

export type StockReport = {
  totalActiveProducts: number;
  lowStock: StockProductSummary[];
  outOfStock: StockProductSummary[];
  stockValueCost: string;
  stockValueSale: string;
};
