import { useState, type FormEvent } from "react";
import { addCashMovement } from "../../api/cash";
import { ApiError } from "../../api/client";
import type { CashMovementType } from "../../types/cash";

export function MovementForm({
  sessionId,
  type,
  onClose,
  onSaved,
}: {
  sessionId: string;
  type: CashMovementType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const title = type === "SANGRIA" ? "Sangria (retirada de dinheiro)" : "Suprimento (entrada de dinheiro)";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await addCashMovement(sessionId, { type, amount: Number(amount) || 0, reason });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível registrar a movimentação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs font-medium text-slate-600">Motivo</label>
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Salvando..." : "Confirmar"}
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
