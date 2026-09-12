import { formatCurrency, formatDateTime, formatQuantity } from "../../lib/format";
import type { PaymentMethod, Sale } from "../../types/sale";

const methodLabels: Record<PaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  OUTRO: "Outro",
};

export function Receipt({ sale, onNewSale }: { sale: Sale; onNewSale: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <div className="text-center">
          <p className="text-sm font-semibold text-green-700">Venda concluída</p>
          <p className="mt-1 text-xs text-slate-400">{formatDateTime(sale.createdAt)}</p>
          {sale.customer && (
            <p className="mt-1 text-xs text-slate-500">Cliente: {sale.customer.name}</p>
          )}
        </div>

        <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100 text-sm">
          {sale.items.map((item) => (
            <div key={item.id} className="flex justify-between py-1.5">
              <span className="text-slate-700">
                {formatQuantity(item.quantity)}x {item.productName}
              </span>
              <span className="text-slate-700">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {Number(sale.discountTotal) > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Desconto</span>
              <span>-{formatCurrency(sale.discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          {sale.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-slate-500">
              <span>{methodLabels[p.method]}</span>
              <span>{formatCurrency(p.amount)}</span>
            </div>
          ))}
          {Number(sale.changeAmount) > 0 && (
            <div className="flex justify-between font-medium text-slate-700">
              <span>Troco</span>
              <span>{formatCurrency(sale.changeAmount)}</span>
            </div>
          )}
        </div>

        <p className="mt-4 rounded-md bg-slate-50 p-2 text-center text-[11px] leading-snug text-slate-400">
          Comprovante não fiscal — não é um documento fiscal válido. A emissão de nota
          fiscal depende de integração fiscal ainda não configurada.
        </p>

        <button
          onClick={onNewSale}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nova venda
        </button>
      </div>
    </div>
  );
}
