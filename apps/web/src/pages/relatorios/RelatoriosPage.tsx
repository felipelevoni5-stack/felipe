import { useState } from "react";
import { VendasTab } from "./VendasTab";
import { FinanceiroTab } from "./FinanceiroTab";
import { EstoqueTab } from "./EstoqueTab";

type Tab = "vendas" | "financeiro" | "estoque";

const tabs: { id: Tab; label: string }[] = [
  { id: "vendas", label: "Vendas" },
  { id: "financeiro", label: "Financeiro" },
  { id: "estoque", label: "Estoque" },
];

export function RelatoriosPage() {
  const [tab, setTab] = useState<Tab>("vendas");

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Relatórios</h1>
      <p className="mt-1 text-sm text-slate-500">Vendas, financeiro e estoque.</p>

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "vendas" && <VendasTab />}
        {tab === "financeiro" && <FinanceiroTab />}
        {tab === "estoque" && <EstoqueTab />}
      </div>
    </div>
  );
}
