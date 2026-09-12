import { useEffect, useState } from "react";
import { fetchSalesSummary, fetchTopProducts, type DateRange } from "../../api/reports";
import { formatCurrency, formatQuantity } from "../../lib/format";
import type { SalesSummary, TopProduct } from "../../types/report";
import { DateRangeFilter } from "./DateRangeFilter";

export function VendasTab() {
  const [range, setRange] = useState<DateRange>({});
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range.from && !range.to) return;
    Promise.all([fetchSalesSummary(range), fetchTopProducts(range)])
      .then(([s, p]) => {
        setSummary(s);
        setTopProducts(p);
      })
      .catch(() => setError("Não foi possível carregar o relatório de vendas."));
  }, [range]);

  return (
    <div>
      <DateRangeFilter onChange={setRange} />

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total vendido" value={summary ? formatCurrency(summary.totalVendido) : "—"} />
        <Card label="Quantidade de vendas" value={summary?.quantidadeVendas ?? "—"} />
        <Card label="Ticket médio" value={summary ? formatCurrency(summary.ticketMedio) : "—"} />
        <Card
          label="Vendas canceladas"
          value={summary ? `${summary.vendasCanceladas} (${formatCurrency(summary.totalCancelado)})` : "—"}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Produtos mais vendidos</h2>
        </div>
        {topProducts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Nenhuma venda no período selecionado.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">Produto</th>
                <th className="px-4 py-2">Quantidade vendida</th>
                <th className="px-4 py-2">Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((p) => (
                <tr key={p.productId}>
                  <td className="px-4 py-2 text-slate-800">{p.name}</td>
                  <td className="px-4 py-2 text-slate-600">{formatQuantity(p.quantity)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatCurrency(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
