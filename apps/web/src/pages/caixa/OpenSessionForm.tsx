import { useState, type FormEvent } from "react";
import { openCashSession } from "../../api/cash";
import { ApiError } from "../../api/client";

export function OpenSessionForm({ onOpened }: { onOpened: () => void }) {
  const [openingAmount, setOpeningAmount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await openCashSession(Number(openingAmount) || 0);
      onOpened();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível abrir o caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Abrir caixa</h2>
      <p className="mt-1 text-sm text-slate-500">
        Informe o fundo inicial (valor em dinheiro no caixa) para começar o expediente.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Fundo inicial (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Abrindo..." : "Abrir caixa"}
        </button>
      </form>
    </div>
  );
}
