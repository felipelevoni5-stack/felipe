import { useEffect, useState, type FormEvent } from "react";
import { fetchTenant, updateTenant } from "../../api/tenant";
import { ApiError } from "../../api/client";

export function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [operatorMaxDiscountPercent, setOperatorMaxDiscountPercent] = useState("0");

  useEffect(() => {
    fetchTenant()
      .then((tenant) => {
        setName(tenant.name);
        setDocument(tenant.document ?? "");
        setAllowNegativeStock(tenant.allowNegativeStock);
        setOperatorMaxDiscountPercent(tenant.operatorMaxDiscountPercent);
      })
      .catch(() => setError("Não foi possível carregar as configurações."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await updateTenant({
        name,
        document: document || undefined,
        allowNegativeStock,
        operatorMaxDiscountPercent: Number(operatorMaxDiscountPercent) || 0,
      });
      setSuccess("Configurações salvas.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar as configurações.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Carregando...</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Configurações</h1>
      <p className="mt-1 text-sm text-slate-500">Ajustes gerais da empresa.</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">Dados da empresa</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome da empresa</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">CNPJ / CPF (opcional)</label>
              <input
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">Estoque</h2>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allowNegativeStock}
              onChange={(e) => setAllowNegativeStock(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Permitir estoque negativo
              <p className="text-xs text-slate-400">
                Se desligado (padrão), vendas e saídas manuais são bloqueadas quando não há
                estoque suficiente do produto.
              </p>
            </span>
          </label>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">Vendas</h2>
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700">
              Desconto máximo para operador de caixa (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={operatorMaxDiscountPercent}
              onChange={(e) => setOperatorMaxDiscountPercent(e.target.value)}
              className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">
              Administradores e gerentes não têm limite de desconto. Use 0 para não permitir
              nenhum desconto ao operador.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-700">Fiscal</h2>
          <p className="mt-2 text-sm text-slate-500">
            Esta versão registra vendas e operações comerciais, mas <strong>não emite
            documentos fiscais oficiais</strong> (NFC-e/NFS-e). A emissão fiscal depende de
            integração com certificado digital, credenciamento junto à SEFAZ (ou provedor
            fiscal compatível) e configuração tributária adequada — nenhuma dessas
            integrações está configurada nesta versão. Este módulo está preparado para
            evoluir numa etapa futura, quando essa integração for contratada.
          </p>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>
    </div>
  );
}
