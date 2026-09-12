import { useEffect, useState } from "react";
import { fetchCurrentSession } from "../../api/cash";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { CashSession } from "../../types/cash";
import { OpenSessionForm } from "./OpenSessionForm";
import { MovementForm } from "./MovementForm";
import { CloseSessionForm } from "./CloseSessionForm";
import { ClosedSessionSummary } from "./ClosedSessionSummary";

const movementLabels = { SANGRIA: "Sangria", SUPRIMENTO: "Suprimento" } as const;

export function CaixaPage() {
  const [session, setSession] = useState<CashSession | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<"SANGRIA" | "SUPRIMENTO" | null>(null);
  const [showClose, setShowClose] = useState(false);
  const [closedSummary, setClosedSummary] = useState<CashSession | null>(null);

  async function load() {
    try {
      setSession(await fetchCurrentSession());
    } catch {
      setError("Não foi possível carregar o status do caixa.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (session === undefined) {
    return <p className="text-sm text-slate-400">Carregando...</p>;
  }

  if (!session) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Caixa</h1>
        <p className="mt-1 text-sm text-slate-500">Nenhum caixa aberto no momento.</p>
        <OpenSessionForm onOpened={load} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Caixa</h1>
          <p className="mt-1 text-sm text-slate-500">{session.cashRegister.name} — aberto</p>
        </div>
        <button
          onClick={() => setShowClose(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Fechar caixa
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Aberto por</p>
          <p className="mt-1 text-slate-800">{session.openedBy.name}</p>
          <p className="text-xs text-slate-400">{formatDateTime(session.openedAt)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Fundo inicial</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatCurrency(session.openingAmount)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setMovementType("SANGRIA")}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Sangria
        </button>
        <button
          onClick={() => setMovementType("SUPRIMENTO")}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Suprimento
        </button>
      </div>

      {movementType && (
        <MovementForm
          sessionId={session.id}
          type={movementType}
          onClose={() => setMovementType(null)}
          onSaved={() => {
            setMovementType(null);
            load();
          }}
        />
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Movimentações do caixa</h2>
        </div>
        {session.movements.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Nenhuma sangria ou suprimento registrado ainda.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {session.movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-slate-500">{formatDateTime(m.createdAt)}</td>
                  <td className="px-4 py-2 text-slate-700">{movementLabels[m.type]}</td>
                  <td className="px-4 py-2 text-slate-700">{formatCurrency(m.amount)}</td>
                  <td className="px-4 py-2 text-slate-500">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showClose && (
        <CloseSessionForm
          sessionId={session.id}
          onClose={() => setShowClose(false)}
          onClosed={(closed) => {
            setShowClose(false);
            setClosedSummary(closed);
          }}
        />
      )}

      {closedSummary && (
        <ClosedSessionSummary
          session={closedSummary}
          onDismiss={() => {
            setClosedSummary(null);
            load();
          }}
        />
      )}
    </div>
  );
}
