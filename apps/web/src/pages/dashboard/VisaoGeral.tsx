import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchOverview, type Overview } from "../../api/tenant";
import { formatCurrency } from "../../lib/format";

export function VisaoGeral() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview()
      .then(setOverview)
      .catch(() => setError("Não foi possível carregar os dados da empresa."));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Visão geral</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bem-vindo(a), {user?.name}. Aqui você acompanhará a operação da sua loja.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vendas hoje" value={overview?.salesTodayCount ?? "—"} />
        <StatCard
          label="Faturamento hoje"
          value={overview ? formatCurrency(overview.revenueToday) : "—"}
        />
        <StatCard
          label="Caixa"
          value={overview ? (overview.cashRegisterOpen ? "Aberto" : "Fechado") : "—"}
          alert={!!overview && !overview.cashRegisterOpen}
        />
        <StatCard
          label="Estoque baixo"
          value={overview?.lowStockCount ?? "—"}
          alert={!!overview && overview.lowStockCount > 0}
        />
      </div>

      {overview && !overview.cashRegisterOpen && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O caixa está fechado — não é possível registrar vendas.{" "}
          <Link to="/caixa" className="font-medium underline">
            Abrir caixa
          </Link>
        </div>
      )}

      {overview && overview.lowStockCount > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {overview.lowStockCount} produto(s) com estoque baixo ou zerado.{" "}
          <Link to="/estoque" className="font-medium underline">
            Ver estoque
          </Link>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Produtos ativos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{overview?.productCount ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Usuários ativos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{overview?.userCount ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lojas ativas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{overview?.storeCount ?? "—"}</p>
        </div>
      </div>

      {overview && overview.salesTodayCount === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Nenhuma venda registrada hoje ainda.{" "}
            <Link to="/pdv" className="font-medium text-blue-600 hover:underline">
              Ir para o PDV
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  muted,
  alert,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          alert ? "text-amber-600" : muted ? "text-sm text-slate-400" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
