import { useEffect, useState } from "react";
import { fetchTenant, type TenantInfo } from "../../api/tenant";

export function MinhaEmpresa() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenant()
      .then(setTenant)
      .catch(() => setError("Não foi possível carregar os dados da empresa."));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Minha empresa</h1>
      <p className="mt-1 text-sm text-slate-500">Dados cadastrais da sua empresa.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {tenant && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-medium text-slate-500">Empresa</h2>
            <p className="mt-1 text-lg font-semibold text-slate-900">{tenant.name}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-medium text-slate-500">Lojas</h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {tenant.stores.map((store) => (
                <li key={store.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-800">{store.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      store.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {store.active ? "Ativa" : "Inativa"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
