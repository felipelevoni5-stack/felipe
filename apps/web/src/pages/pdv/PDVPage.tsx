import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { lookupProduct, listProducts } from "../../api/products";
import { createSale } from "../../api/sales";
import { fetchTenant } from "../../api/tenant";
import { fetchCurrentSession } from "../../api/cash";
import { ApiError } from "../../api/client";
import { formatCurrency, formatQuantity } from "../../lib/format";
import { toCents, fromCents } from "../../lib/money";
import type { Product } from "../../types/product";
import type { PaymentMethod, Sale } from "../../types/sale";
import type { Customer } from "../../types/customer";
import type { CartItem } from "./types";
import { PaymentPanel } from "./PaymentPanel";
import { Receipt } from "./Receipt";
import { CustomerPicker } from "./CustomerPicker";

function newClientRequestId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PDVPage() {
  const { user } = useAuth();
  const [operatorMaxDiscount, setOperatorMaxDiscount] = useState(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleDiscount, setSaleDiscount] = useState("0");

  const [code, setCode] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clientRequestId = useRef(newClientRequestId());

  const [showPayment, setShowPayment] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [cashOpen, setCashOpen] = useState<boolean | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchTenant()
      .then((t) => setOperatorMaxDiscount(Number(t.operatorMaxDiscountPercent)))
      .catch(() => {});
    fetchCurrentSession()
      .then((s) => setCashOpen(!!s))
      .catch(() => {});
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (code.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      listProducts({ search: code.trim(), status: "ativos" })
        .then((products) => setSuggestions(products.slice(0, 6)))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [code]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: Number(product.salePrice),
          quantity: 1,
          discount: 0,
          stockQuantity: Number(product.stockQuantity),
          unit: product.unit,
        },
      ];
    });
    setCode("");
    setSuggestions([]);
    setLookupError(null);
    inputRef.current?.focus();
  }

  async function handleCodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setLookupError(null);
    try {
      const product = await lookupProduct(value);
      addToCart(product);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLookupError("Produto não encontrado.");
      } else {
        setLookupError("Não foi possível buscar o produto.");
      }
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }

  function updateDiscount(productId: string, discount: number) {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, discount } : i)));
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  function cancelSaleInProgress() {
    setCart([]);
    setSaleDiscount("0");
    setCode("");
    setSuggestions([]);
    setLookupError(null);
    setCustomer(null);
    inputRef.current?.focus();
  }

  const subtotalCents = cart.reduce((acc, i) => acc + toCents(i.unitPrice * i.quantity), 0);
  const itemDiscountCents = cart.reduce((acc, i) => acc + toCents(i.discount), 0);
  const saleDiscountValue = Number(saleDiscount) || 0;
  const discountTotalCents = itemDiscountCents + toCents(saleDiscountValue);
  const totalCents = Math.max(0, subtotalCents - discountTotalCents);

  const subtotal = fromCents(subtotalCents);
  const discountTotal = fromCents(discountTotalCents);
  const total = fromCents(totalCents);
  const discountPercent = subtotalCents > 0 ? (discountTotalCents / subtotalCents) * 100 : 0;

  const canDiscount = user?.role !== "OPERADOR" || operatorMaxDiscount > 0;
  const discountBlocked = user?.role === "OPERADOR" && discountPercent > operatorMaxDiscount;

  async function handleConfirmPayment(payments: { method: PaymentMethod; amount: number }[]) {
    const sale = await createSale({
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, discount: i.discount })),
      discountTotal: saleDiscountValue,
      payments,
      clientRequestId: clientRequestId.current,
      customerId: customer?.id,
    });
    setShowPayment(false);
    setCompletedSale(sale);
  }

  function handleNewSale() {
    setCompletedSale(null);
    clientRequestId.current = newClientRequestId();
    cancelSaleInProgress();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">PDV / Vendas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Use o leitor de código de barras ou digite e pressione Enter.
      </p>

      {cashOpen === false && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          O caixa está fechado. Você pode montar a venda, mas só conseguirá finalizá-la
          depois de{" "}
          <Link to="/caixa" className="font-medium underline">
            abrir o caixa
          </Link>
          .
        </div>
      )}

      <div className="relative mt-4 max-w-lg">
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleCodeKeyDown}
          placeholder="Código de barras, SKU ou nome do produto"
          className="w-full rounded-md border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addToCart(p)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span>
                    {p.name}
                    {p.barcode ? <span className="text-slate-400"> · {p.barcode}</span> : null}
                  </span>
                  <span className="text-slate-500">{formatCurrency(p.salePrice)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {lookupError && <p className="mt-2 text-sm text-red-600">{lookupError}</p>}

      <div className="mt-4">
        <CustomerPicker customer={customer} onSelect={setCustomer} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Qtd.</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Desconto</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cart.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Carrinho vazio. Busque um produto para começar a venda.
                </td>
              </tr>
            )}
            {cart.map((item) => {
              const lineSubtotal = fromCents(
                toCents(item.unitPrice * item.quantity) - toCents(item.discount),
              );
              const overStock = item.quantity > item.stockQuantity;
              return (
                <tr key={item.productId}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-800">{item.name}</p>
                    {overStock && (
                      <p className="text-xs text-amber-600">
                        Estoque disponível: {formatQuantity(item.stockQuantity)} {item.unit}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!canDiscount}
                      value={item.discount}
                      onChange={(e) => updateDiscount(item.productId, Number(e.target.value) || 0)}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-800">{formatCurrency(lineSubtotal)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Desconto na venda (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            disabled={!canDiscount}
            value={saleDiscount}
            onChange={(e) => setSaleDiscount(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
          {!canDiscount && (
            <span className="text-xs text-slate-400">Seu perfil não pode aplicar descontos.</span>
          )}
        </div>

        <div className="w-full max-w-xs space-y-1 text-sm sm:text-right">
          <div className="flex justify-between sm:justify-end sm:gap-4">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between sm:justify-end sm:gap-4">
              <span className="text-slate-500">Desconto</span>
              <span>-{formatCurrency(discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold text-slate-900 sm:justify-end sm:gap-4">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {discountBlocked && (
        <p className="mt-2 text-right text-sm text-red-600">
          Desconto de {discountPercent.toFixed(1)}% acima do limite permitido para seu perfil
          ({operatorMaxDiscount}%).
        </p>
      )}

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={cancelSaleInProgress}
          disabled={cart.length === 0}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar venda
        </button>
        <button
          onClick={() => setShowPayment(true)}
          disabled={cart.length === 0 || total <= 0 || discountBlocked}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Finalizar venda
        </button>
      </div>

      {showPayment && (
        <PaymentPanel total={total} onCancel={() => setShowPayment(false)} onConfirm={handleConfirmPayment} />
      )}

      {completedSale && <Receipt sale={completedSale} onNewSale={handleNewSale} />}
    </div>
  );
}
