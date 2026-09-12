export type PaymentMethod = "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO" | "OUTRO";

export type SaleItemResult = {
  id: string;
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: string;
  discount: string;
  subtotal: string;
};

export type PaymentResult = {
  id: string;
  method: PaymentMethod;
  amount: string;
};

export type Sale = {
  id: string;
  status: "CONCLUIDA" | "CANCELADA";
  subtotal: string;
  discountTotal: string;
  total: string;
  amountPaid: string;
  changeAmount: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  items: SaleItemResult[];
  payments: PaymentResult[];
  user: { id: string; name: string };
  customer: { id: string; name: string } | null;
};
