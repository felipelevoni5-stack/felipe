import { useEffect, useState } from "react";
import { listAuditLogs } from "../../api/auditLogs";
import { formatDateTime } from "../../lib/format";
import type { AuditLog } from "../../types/auditLog";

const actionLabels: Record<string, string> = {
  SIGNUP_EMPRESA: "Empresa cadastrada",
  LOGIN_SUCCESS: "Login realizado",
  LOGIN_FAILED: "Tentativa de login falhou",
  PASSWORD_RESET_REQUESTED: "Redefinição de senha solicitada",
  PASSWORD_RESET_COMPLETED: "Senha redefinida",
  USER_CREATED: "Usuário criado",
  USER_UPDATED: "Usuário atualizado",
  PRODUCT_CREATED: "Produto criado",
  PRODUCT_UPDATED: "Produto atualizado",
  PRODUCT_PRICE_CHANGED: "Preço de produto alterado",
  CUSTOMER_CREATED: "Cliente criado",
  CUSTOMER_UPDATED: "Cliente atualizado",
  STOCK_ENTRADA: "Entrada de estoque",
  STOCK_SAIDA: "Saída de estoque",
  STOCK_AJUSTE: "Ajuste de estoque",
  STOCK_INVENTARIO: "Inventário de estoque",
  SALE_CREATED: "Venda registrada",
  SALE_CANCELLED: "Venda cancelada",
  CASH_SESSION_OPENED: "Caixa aberto",
  CASH_SESSION_CLOSED: "Caixa fechado",
  CASH_WITHDRAWAL: "Sangria registrada",
  CASH_SUPPLY: "Suprimento registrado",
};

const entities = [
  "Tenant",
  "User",
  "Product",
  "Customer",
  "Sale",
  "CashSession",
];

export function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLogs(await listAuditLogs({ entity: entity || undefined, limit: 100 }));
    } catch {
      setError("Não foi possível carregar os logs de auditoria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Auditoria</h1>
      <p className="mt-1 text-sm text-slate-500">
        Trilha de ações sensíveis registradas no sistema (últimos 100 eventos).
      </p>

      <div className="mt-4">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas as entidades</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum evento encontrado.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 text-slate-500">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-2 text-slate-700">
                  {log.user ? `${log.user.name}` : "—"}
                </td>
                <td className="px-4 py-2 text-slate-800">{actionLabels[log.action] ?? log.action}</td>
                <td className="px-4 py-2 text-slate-500">{log.entity}</td>
                <td className="px-4 py-2 text-xs text-slate-400">
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
