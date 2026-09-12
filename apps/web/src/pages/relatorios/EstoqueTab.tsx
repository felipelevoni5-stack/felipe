import { useEffect, useState } from "react";
import { fetchStockReport } from "../../api/reports";
import { formatCurrency, formatQuantity } from "../../lib/format";
import type { StockReport } from "../../types/report";

export function EstoqueTab() {
  const [report, setReport] = useState<StockReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStockReport()
      .then(setReport)
      .catch(() => setError("Não foi possível carregar o relatório de estoque."));
  }, []);

  return (
    <div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Produtos ativos" value={report?.totalActiveProducts ?? "—"} />
        <Card label="Estoque baixo" value={report?.lowStock.length ?? "—"} alert={!!report && report.lowStock.length > 0} />
        <Card label="Sem estoque" value={report?.outOfStock.length ?? "—"} alert={!!report && report.outOfStock.length > 0} />
        <Card
          label="Valor em estoque (custo)"
          value={report ? formatCurrency(report.stockValueCost) : "—"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductList title="Estoque baixo" products={report?.lowStock ?? []} empty="Nenhum produto com estoque baixo." />
        <ProductList title="Sem estoque" products={report?.outOfStock ?? []} empty="Nenhum produto sem estoque." />
      </div>
    </div>
  );
}

function Card({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${alert ? "text-amber-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function ProductList({
  title,
  products,
  empty,
}: {
  title: string;
  products: { id: string; name: string; stockQuantity: string; unit: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      {products.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {products.map((p) => (
            <li key={p.id} className="flex justify-between px-4 py-2">
              <span className="text-slate-800">{p.name}</span>
              <span className="text-slate-500">
                {formatQuantity(p.stockQuantity)} {p.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
