import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listProducts, type ProductFilters } from "../../api/products";
import { listCategories } from "../../api/categories";
import type { Category, Product, StockStatus } from "../../types/product";
import { formatCurrency, formatQuantity } from "../../lib/format";
import { ProductForm } from "./ProductForm";

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

export function ProdutosPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "GERENTE";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductFilters["status"]>("ativos");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  async function loadCategories() {
    try {
      setCategories(await listCategories());
    } catch {
      // categorias são opcionais na listagem; falha aqui não impede ver produtos
    }
  }

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      setProducts(await listProducts({ search: search || undefined, categoryId: categoryId || undefined, status }));
    } catch {
      setError("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadProducts, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, status]);

  function openCreate() {
    setEditingProduct(null);
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Produtos</h1>
          <p className="mt-1 text-sm text-slate-500">Cadastro de produtos e categorias.</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Novo produto
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          placeholder="Buscar por nome, SKU ou código de barras"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductFilters["status"])}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onCategoryCreated={loadCategories}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadProducts();
          }}
        />
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Estoque</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">
                    {p.sku ? `SKU: ${p.sku}` : ""} {p.barcode ? `· Cód: ${p.barcode}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-500">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{formatCurrency(p.salePrice)}</td>
                <td className="px-4 py-3 text-slate-700">
                  {formatQuantity(p.stockQuantity)} {p.unit}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[p.status]}`}>
                    {statusLabels[p.status]}
                  </span>
                  {!p.active && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Inativo
                    </span>
                  )}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-sm text-blue-600 hover:underline">
                      Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
