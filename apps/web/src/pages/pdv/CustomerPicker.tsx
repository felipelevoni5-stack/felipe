import { useEffect, useState } from "react";
import { listCustomers } from "../../api/customers";
import type { Customer } from "../../types/customer";

export function CustomerPicker({
  customer,
  onSelect,
}: {
  customer: Customer | null;
  onSelect: (customer: Customer | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || search.trim().length < 1) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      listCustomers({ search }).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, open]);

  if (customer) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Cliente:</span>
        <span className="font-medium text-slate-800">{customer.name}</span>
        <button
          onClick={() => onSelect(null)}
          className="text-xs text-slate-400 hover:text-red-600"
        >
          Remover
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-blue-600 hover:underline"
      >
        + Identificar cliente (opcional)
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <input
            autoFocus
            placeholder="Buscar por nome, telefone ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <ul className="mt-1 max-h-48 overflow-y-auto">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
                >
                  {c.name} {c.phone ? <span className="text-slate-400">· {c.phone}</span> : null}
                </button>
              </li>
            ))}
            {search.trim().length > 0 && results.length === 0 && (
              <li className="px-2 py-1 text-xs text-slate-400">Nenhum cliente encontrado.</li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1 text-xs text-slate-400 hover:text-slate-600"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
