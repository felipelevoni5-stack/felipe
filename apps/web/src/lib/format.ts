export function formatCurrency(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatQuantity(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}
