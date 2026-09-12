import { formatCurrency, formatDateTime } from "../../lib/format";
import type { CashSession } from "../../types/cash";

export function ClosedSessionSummary({
  session,
  onDismiss,
}: {
  session: CashSession;
  onDismiss: () => void;
}) {
  const difference = Number(session.difference ?? 0);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Caixa fechado</h2>
        <p className="mt-1 text-xs text-slate-400">
          {formatDateTime(session.openedAt)} — {session.closedAt && formatDateTime(session.closedAt)}
        </p>

        <div className="mt-4 space-y-1 text-sm">
          <Row label="Fundo inicial" value={formatCurrency(session.openingAmount)} />
          <Row label="Total em dinheiro" value={formatCurrency(session.totalDinheiro ?? 0)} />
          <Row label="Total em Pix" value={formatCurrency(session.totalPix ?? 0)} />
          <Row label="Total em débito" value={formatCurrency(session.totalDebito ?? 0)} />
          <Row label="Total em crédito" value={formatCurrency(session.totalCredito ?? 0)} />
          <Row label="Total outros" value={formatCurrency(session.totalOutro ?? 0)} />
          <Row label="Suprimentos" value={formatCurrency(session.totalSuprimentos ?? 0)} />
          <Row label="Sangrias" value={`-${formatCurrency(session.totalSangrias ?? 0)}`} />
          {Number(session.totalCancelado) > 0 && (
            <Row label="Vendas canceladas" value={formatCurrency(session.totalCancelado ?? 0)} muted />
          )}
        </div>

        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          <Row label="Valor esperado" value={formatCurrency(session.expectedCash ?? 0)} />
          <Row label="Valor contado" value={formatCurrency(session.countedCash ?? 0)} />
          <Row
            label="Diferença"
            value={formatCurrency(session.difference ?? 0)}
            highlight={difference !== 0 ? (difference > 0 ? "positive" : "negative") : undefined}
          />
        </div>

        {session.closingJustification && (
          <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
            Justificativa: {session.closingJustification}
          </p>
        )}

        <button
          onClick={onDismiss}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ok
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: "positive" | "negative";
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-slate-400" : "text-slate-500"}>{label}</span>
      <span
        className={
          highlight === "positive"
            ? "font-medium text-green-700"
            : highlight === "negative"
              ? "font-medium text-red-600"
              : "text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
