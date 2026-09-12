import { useState, type FormEvent } from "react";
import { closeCashSession } from "../../api/cash";
import { ApiError } from "../../api/client";
import type { CashSession } from "../../types/cash";

export function CloseSessionForm({
  sessionId,
  onClose,
  onClosed,
}: {
  sessionId: string;
  onClose: () => void;
  onClosed: (session: CashSession) => void;
}) {
  const [countedCash, setCountedCash] = useState("");
  const [justification, setJustification] = useState("");
  const [needsJustification, setNeedsJustification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const closed = await closeCashSession(sessionId, {
        countedCash: Number(countedCash) || 0,
        justification: justification || undefined,
      });
      onClosed(closed);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (/justificativa/i.test(err.message)) setNeedsJustification(true);
      } else {
        setError("Não foi possível fechar o caixa.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Fechar caixa</h2>
        <p className="mt-1 text-sm text-slate-500">
          Conte o dinheiro em caixa e informe o valor abaixo.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Valor contado em dinheiro (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {needsJustification && (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Justificativa da diferença
              </label>
              <textarea
                required
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Fechando..." : "Fechar caixa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
