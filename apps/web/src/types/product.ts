export type Category = {
  id: string;
  name: string;
  active: boolean;
};

export type StockStatus = "ZERADO" | "BAIXO" | "NORMAL";

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  category: Category | null;
  brand: string | null;
  description: string | null;
  costPrice: string;
  salePrice: string;
  stockQuantity: string;
  minStock: string;
  unit: string;
  supplierName: string | null;
  imageUrl: string | null;
  active: boolean;
  status: StockStatus;
};

export type StockMovementType =
  | "ENTRADA"
  | "SAIDA"
  | "AJUSTE"
  | "INVENTARIO"
  | "VENDA"
  | "CANCELAMENTO";

export type StockMovement = {
  id: string;
  type: StockMovementType;
  quantity: string;
  previousQuantity: string;
  newQuantity: string;
  reason: string | null;
  saleId: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
};
