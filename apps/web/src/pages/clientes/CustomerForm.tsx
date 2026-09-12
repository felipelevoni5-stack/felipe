import { useState, type FormEvent } from "react";
import { createCustomer, updateCustomer } from "../../api/customers";
import { ApiError } from "../../api/client";
import type { Customer } from "../../types/customer";

export function CustomerForm({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!customer;
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [document, setDocument] = useState(customer?.document ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name,
        phone: phone || undefined,
        email: email || undefined,
        document: document || undefined,
        notes: notes || undefined,
      };
      if (isEditing) await updateCustomer(customer.id, payload);
      else await createCustomer(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o cliente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          {isEditing ? "Editar cliente" : "Novo cliente"}
        </h2>
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
          Fechar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nome" required value={name} onChange={setName} />
        <Field label="Telefone" value={phone} onChange={setPhone} />
        <Field label="E-mail" type="email" value={email} onChange={setEmail} />
        <Field label="CPF (opcional)" value={document} onChange={setDocument} />
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-1"
        >
          {submitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar cliente"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  onChange,
  value,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
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
    </div>
  );
}
