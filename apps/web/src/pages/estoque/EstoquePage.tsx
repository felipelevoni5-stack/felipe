import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listProducts } from "../../api/products";
import type { Product, StockStatus } from "../../types/product";
import { formatQuantity } from "../../lib/format";
import { StockMovementForm, type ManualStockMovementType } from "./StockMovementForm";
import { StockHistory } from "./StockHistory";

const statusStyles: Record<StockStatus, string> = {
  ZERADO: "bg-red-50 text-red-700",
  BAIXO: "bg-amber-50 text-amber-700",
  NORMAL: "bg-green-50 text-green-700",
};

const statusLabels: Record<StockStatus, string> = {
  ZERADO: "Zerado",
  BAIXO: "Estoque baixo",
  NORMAL: "Normal",
};

export function EstoquePage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "GERENTE";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const [action, setAction] = useState<{ productId: string; type: ManualStockMovementType } | null>(
    null,
  );
  const [historyProductId, setHistoryProductId] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setProducts(await listProducts({ status: "ativos", lowStock: onlyLowStock || undefined }));
    } catch {
      setError("Não foi possível carregar o estoque.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyLowStock]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Estoque</h1>
          <p className="mt-1 text-sm text-slate-500">
            Entradas, saídas, ajustes e histórico de movimentações.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
          />
          Mostrar só estoque baixo/zerado
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-slate-400">Carregando...</p>}
        {!loading && products.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
            {onlyLowStock ? "Nenhum produto com estoque baixo." : "Nenhum produto cadastrado ainda."}
          </p>
        )}

        {products.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-400">
                  Estoque: {formatQuantity(p.stockQuantity)} {p.unit} · Mínimo:{" "}
                  {formatQuantity(p.minStock)} {p.unit}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[p.status]}`}>
                  {statusLabels[p.status]}
                </span>

                {canManage && (
                  <>
                    <button
                      onClick={() => setAction({ productId: p.id, type: "ENTRADA" })}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Entrada
                    </button>
                    <button
                      onClick={() => setAction({ productId: p.id, type: "SAIDA" })}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Saída
                    </button>
                    <button
                      onClick={() => setAction({ productId: p.id, type: "AJUSTE" })}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Ajuste
                    </button>
                  </>
                )}
                <button
                  onClick={() => setHistoryProductId(historyProductId === p.id ? null : p.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {historyProductId === p.id ? "Ocultar histórico" : "Histórico"}
                </button>
              </div>
            </div>

            {action?.productId === p.id && (
              <StockMovementForm
                product={p}
                type={action.type}
                onClose={() => setAction(null)}
                onSaved={() => {
                  setAction(null);
                  setHistoryVersion((v) => v + 1);
                  load();
                }}
              />
            )}

            {historyProductId === p.id && (
              <StockHistory key={historyVersion} productId={p.id} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
