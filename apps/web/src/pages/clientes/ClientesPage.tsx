import { Fragment, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listCustomers, updateCustomer, type CustomerFilters } from "../../api/customers";
import type { Customer } from "../../types/customer";
import { CustomerForm } from "./CustomerForm";
import { CustomerHistory } from "./CustomerHistory";

export function ClientesPage() {
  const { user } = useAuth();
  const canSeeHistory = user?.role === "ADMIN" || user?.role === "GERENTE";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerFilters["status"]>("ativos");

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await listCustomers({ search: search || undefined, status }));
    } catch {
      setError("Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  async function toggleActive(customer: Customer) {
    try {
      await updateCustomer(customer.id, { active: !customer.active });
      load();
    } catch {
      setError("Não foi possível atualizar o cliente.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cadastro opcional — o PDV funciona normalmente sem cliente identificado.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowForm((v) => !v);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Novo cliente
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          placeholder="Buscar por nome, telefone, e-mail ou CPF"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CustomerFilters["status"])}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
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
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <Fragment key={c.id}>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditingCustomer(c);
                          setShowForm(true);
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      {canSeeHistory && (
                        <button
                          onClick={() =>
                            setHistoryCustomerId(historyCustomerId === c.id ? null : c.id)
                          }
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {historyCustomerId === c.id ? "Ocultar" : "Histórico"}
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(c)}
                        className="text-sm text-slate-500 hover:underline"
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
                {historyCustomerId === c.id && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 px-4 py-3">
                      <CustomerHistory customerId={c.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
