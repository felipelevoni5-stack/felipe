import { useState, type FormEvent } from "react";
import { createStockMovement } from "../../api/stock";
import { ApiError } from "../../api/client";
import type { Product } from "../../types/product";
import { formatQuantity } from "../../lib/format";

// Apenas os tipos que um usuário pode registrar manualmente aqui — VENDA e
// CANCELAMENTO são gerados automaticamente pelo PDV, nunca por este formulário.
export type ManualStockMovementType = "ENTRADA" | "SAIDA" | "AJUSTE" | "INVENTARIO";

const typeLabels: Record<ManualStockMovementType, string> = {
  ENTRADA: "Entrada de mercadoria",
  SAIDA: "Saída manual",
  AJUSTE: "Ajuste de estoque",
  INVENTARIO: "Inventário (contagem)",
};

export function StockMovementForm({
  product,
  type,
  onClose,
  onSaved,
}: {
  product: Product;
  type: ManualStockMovementType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isDelta = type === "ENTRADA" || type === "SAIDA";
  const [quantity, setQuantity] = useState("");
  const [newQuantity, setNewQuantity] = useState(product.stockQuantity);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createStockMovement(product.id, {
        type,
        quantity: isDelta ? Number(quantity) : undefined,
        newQuantity: isDelta ? undefined : Number(newQuantity),
        reason: reason || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível registrar a movimentação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {typeLabels[type]} — {product.name}
        </h3>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">
          Cancelar
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Estoque atual: {formatQuantity(product.stockQuantity)} {product.unit}
      </p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-3">
        {isDelta ? (
          <div>
            <label className="block text-xs font-medium text-slate-600">Quantidade</label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-600">Nova quantidade contada</label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
        )}

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600">
            Motivo {type === "SAIDA" ? "(obrigatório)" : "(opcional)"}
          </label>
          <input
            required={type === "SAIDA"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Salvando..." : "Confirmar"}
        </button>

        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
