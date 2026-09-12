import { useEffect, useState } from "react";
import { listStockMovements } from "../../api/stock";
import type { StockMovement, StockMovementType } from "../../types/product";
import { formatDateTime, formatQuantity } from "../../lib/format";

const typeLabels: Record<StockMovementType, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
  INVENTARIO: "Inventário",
  VENDA: "Venda",
  CANCELAMENTO: "Cancelamento de venda",
};

export function StockHistory({ productId }: { productId: string }) {
  const [movements, setMovements] = useState<StockMovement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStockMovements(productId)
      .then(setMovements)
      .catch(() => setError("Não foi possível carregar o histórico."));
  }, [productId]);

  if (error) return <p className="mt-3 text-sm text-red-600">{error}</p>;
  if (!movements) return <p className="mt-3 text-sm text-slate-400">Carregando histórico...</p>;
  if (movements.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">Nenhuma movimentação registrada ainda.</p>;
  }

  return (
    <table className="mt-3 w-full text-left text-xs">
      <thead className="text-slate-400">
        <tr>
          <th className="py-1 pr-3">Data</th>
          <th className="py-1 pr-3">Tipo</th>
          <th className="py-1 pr-3">Quantidade</th>
          <th className="py-1 pr-3">Antes → Depois</th>
          <th className="py-1 pr-3">Motivo</th>
          <th className="py-1 pr-3">Usuário</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {movements.map((m) => (
          <tr key={m.id}>
            <td className="py-1.5 pr-3 text-slate-500">{formatDateTime(m.createdAt)}</td>
            <td className="py-1.5 pr-3 text-slate-700">{typeLabels[m.type]}</td>
            <td className="py-1.5 pr-3 text-slate-700">
              {Number(m.quantity) > 0 ? "+" : ""}
              {formatQuantity(m.quantity)}
            </td>
            <td className="py-1.5 pr-3 text-slate-500">
              {formatQuantity(m.previousQuantity)} → {formatQuantity(m.newQuantity)}
            </td>
            <td className="py-1.5 pr-3 text-slate-500">{m.reason ?? "—"}</td>
            <td className="py-1.5 pr-3 text-slate-500">{m.user?.name ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
