import { useState, type FormEvent } from "react";
import { createProduct, updateProduct } from "../../api/products";
import { createCategory } from "../../api/categories";
import { ApiError } from "../../api/client";
import type { Category, Product } from "../../types/product";

type Props = {
  product: Product | null;
  categories: Category[];
  onCategoryCreated: () => void;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductForm({ product, categories, onCategoryCreated, onClose, onSaved }: Props) {
  const isEditing = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? "");
  const [salePrice, setSalePrice] = useState(product?.salePrice ?? "");
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity ?? "0");
  const [minStock, setMinStock] = useState(product?.minStock ?? "0");
  const [unit, setUnit] = useState(product?.unit ?? "UN");
  const [supplierName, setSupplierName] = useState(product?.supplierName ?? "");
  const [active, setActive] = useState(product?.active ?? true);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const category = await createCategory(newCategoryName.trim());
      setNewCategoryName("");
      onCategoryCreated();
      setCategoryId(category.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a categoria.");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name,
        sku: sku || undefined,
        barcode: barcode || undefined,
        categoryId: categoryId || undefined,
        brand: brand || undefined,
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        minStock: Number(minStock),
        unit,
        supplierName: supplierName || undefined,
      };

      if (isEditing) {
        await updateProduct(product.id, { ...payload, active });
      } else {
        await createProduct({ ...payload, stockQuantity: Number(stockQuantity) });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o produto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          {isEditing ? "Editar produto" : "Novo produto"}
        </h2>
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
          Fechar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nome" required value={name} onChange={setName} />
        <Field label="SKU / código interno" value={sku} onChange={setSku} />
        <Field label="Código de barras" value={barcode} onChange={setBarcode} />

        <div>
          <label className="block text-sm font-medium text-slate-700">Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              placeholder="Nova categoria"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={creatingCategory || !newCategoryName.trim()}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Criar
            </button>
          </div>
        </div>

        <Field label="Marca" value={brand} onChange={setBrand} />
        <Field label="Fornecedor" value={supplierName} onChange={setSupplierName} />
        <Field label="Unidade de medida" value={unit} onChange={setUnit} hint="Ex.: UN, KG, CX" />

        <Field
          label="Preço de custo (R$)"
          type="number"
          step="0.01"
          required
          value={costPrice}
          onChange={setCostPrice}
        />
        <Field
          label="Preço de venda (R$)"
          type="number"
          step="0.01"
          required
          value={salePrice}
          onChange={setSalePrice}
        />
        <Field
          label="Estoque mínimo"
          type="number"
          step="0.001"
          value={minStock}
          onChange={setMinStock}
        />

        {!isEditing && (
          <Field
            label="Estoque inicial"
            type="number"
            step="0.001"
            value={stockQuantity}
            onChange={setStockQuantity}
            hint="Após criado, use a página Estoque para novas movimentações."
          />
        )}

        {isEditing && (
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Produto ativo (aparece para novas vendas)
          </label>
        )}

        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="col-span-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-1"
        >
          {submitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar produto"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  onChange,
  value,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
