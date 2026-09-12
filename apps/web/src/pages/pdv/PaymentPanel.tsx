import { useMemo, useState } from "react";
import { formatCurrency } from "../../lib/format";
import { toCents, fromCents } from "../../lib/money";
import { ApiError } from "../../api/client";
import type { PaymentMethod } from "../../types/sale";

const methodLabels: Record<PaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  OUTRO: "Outro",
};

type PaymentLine = { method: PaymentMethod; amount: string };

export function PaymentPanel({
  total,
  onCancel,
  onConfirm,
}: {
  total: number;
  onCancel: () => void;
  onConfirm: (payments: { method: PaymentMethod; amount: number }[]) => Promise<void>;
}) {
  const [lines, setLines] = useState<PaymentLine[]>([{ method: "DINHEIRO", amount: total.toFixed(2) }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { cashTotal, nonCashTotal, change, missing } = useMemo(() => {
    let cashCents = 0;
    let nonCashCents = 0;
    for (const line of lines) {
      const cents = toCents(Number(line.amount) || 0);
      if (line.method === "DINHEIRO") cashCents += cents;
      else nonCashCents += cents;
    }
    const remainingForCashCents = Math.max(0, toCents(total) - nonCashCents);
    return {
      cashTotal: fromCents(cashCents),
      nonCashTotal: fromCents(nonCashCents),
      change: fromCents(Math.max(0, cashCents - remainingForCashCents)),
      missing: fromCents(Math.max(0, remainingForCashCents - cashCents)),
    };
  }, [lines, total]);

  function updateLine(index: number, patch: Partial<PaymentLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    const usedMethods = new Set(lines.map((l) => l.method));
    const nextMethod = (Object.keys(methodLabels) as PaymentMethod[]).find((m) => !usedMethods.has(m));
    setLines((prev) => [...prev, { method: nextMethod ?? "OUTRO", amount: "0" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(
        lines
          .map((l) => ({ method: l.method, amount: Number(l.amount) || 0 }))
          .filter((l) => l.amount > 0),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o pagamento.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Pagamento</h2>
        <p className="mt-1 text-sm text-slate-500">Total a pagar: {formatCurrency(total)}</p>

        <div className="mt-4 space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={line.method}
                onChange={(e) => updateLine(i, { method: e.target.value as PaymentMethod })}
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              >
                {(Object.keys(methodLabels) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {methodLabels[m]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={line.amount}
                onChange={(e) => updateLine(i, { amount: e.target.value })}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  Remover
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addLine}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            + Adicionar forma de pagamento
          </button>
        </div>

        <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Total pago</span>
            <span>{formatCurrency(cashTotal + nonCashTotal)}</span>
          </div>
          {missing > 0 ? (
            <div className="flex justify-between font-medium text-red-600">
              <span>Falta</span>
              <span>{formatCurrency(missing)}</span>
            </div>
          ) : (
            <div className="flex justify-between font-medium text-green-700">
              <span>Troco</span>
              <span>{formatCurrency(change)}</span>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || missing > 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Finalizando..." : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
