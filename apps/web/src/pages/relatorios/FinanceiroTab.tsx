import { useEffect, useState } from "react";
import { fetchPaymentsReport, type DateRange } from "../../api/reports";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { PaymentsReport } from "../../types/report";
import { DateRangeFilter } from "./DateRangeFilter";

const methodLabels = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  OUTRO: "Outro",
} as const;

export function FinanceiroTab() {
  const [range, setRange] = useState<DateRange>({});
  const [report, setReport] = useState<PaymentsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range.from && !range.to) return;
    fetchPaymentsReport(range)
      .then(setReport)
      .catch(() => setError("Não foi possível carregar o relatório financeiro."));
  }, [range]);

  return (
    <div>
      <DateRangeFilter onChange={setRange} />

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(methodLabels) as (keyof typeof methodLabels)[]).map((method) => (
          <div key={method} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {methodLabels[method]}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {report ? formatCurrency(report.totals[method]) : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Suprimentos</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {report ? formatCurrency(report.totalSuprimentos) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sangrias</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {report ? formatCurrency(report.totalSangrias) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Fechamentos de caixa</h2>
        </div>
        {!report || report.fechamentos.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Nenhum fechamento de caixa no período selecionado.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">Fechado em</th>
                <th className="px-4 py-2">Aberto por</th>
                <th className="px-4 py-2">Fechado por</th>
                <th className="px-4 py-2">Esperado</th>
                <th className="px-4 py-2">Contado</th>
                <th className="px-4 py-2">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.fechamentos.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2 text-slate-600">
                    {f.closedAt ? formatDateTime(f.closedAt) : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{f.openedBy}</td>
                  <td className="px-4 py-2 text-slate-600">{f.closedBy ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {f.expectedCash ? formatCurrency(f.expectedCash) : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {f.countedCash ? formatCurrency(f.countedCash) : "—"}
                  </td>
                  <td
                    className={`px-4 py-2 font-medium ${
                      Number(f.difference) === 0
                        ? "text-slate-600"
                        : Number(f.difference) > 0
                          ? "text-green-700"
                          : "text-red-600"
                    }`}
                  >
                    {f.difference ? formatCurrency(f.difference) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
