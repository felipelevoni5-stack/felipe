import { useEffect, useState } from "react";
import { fetchCustomerHistory } from "../../api/customers";
import { formatCurrency, formatDateTime, formatQuantity } from "../../lib/format";
import { ApiError } from "../../api/client";
import type { CustomerPurchase } from "../../types/customer";

export function CustomerHistory({ customerId }: { customerId: string }) {
  const [sales, setSales] = useState<CustomerPurchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerHistory(customerId)
      .then(setSales)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Não foi possível carregar o histórico.",
        ),
      );
  }, [customerId]);

  if (error) return <p className="mt-3 text-sm text-red-600">{error}</p>;
  if (!sales) return <p className="mt-3 text-sm text-slate-400">Carregando histórico...</p>;
  if (sales.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">Nenhuma compra registrada ainda.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {sales.map((sale) => (
        <div key={sale.id} className="rounded-md border border-slate-100 p-2 text-xs">
          <div className="flex justify-between font-medium text-slate-700">
            <span>{formatDateTime(sale.createdAt)}</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <p className="mt-1 text-slate-400">
            {sale.items.map((i) => `${formatQuantity(i.quantity)}x ${i.productName}`).join(", ")}
          </p>
        </div>
      ))}
    </div>
  );
}
