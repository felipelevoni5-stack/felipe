import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signupEmpresa } from "../../api/auth";
import { ApiError } from "../../api/client";

export function SignupEmpresa() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    empresaNome: "",
    lojaNome: "",
    adminNome: "",
    email: "",
    senha: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signupEmpresa(form);
      await login(form.email, form.senha);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Criar sua empresa</h1>
        <p className="mt-1 text-sm text-slate-500">
          Crie a conta da sua empresa e do administrador responsável.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Nome da empresa" value={form.empresaNome} onChange={update("empresaNome")} required />
          <Field
            label="Nome da loja (opcional)"
            value={form.lojaNome}
            onChange={update("lojaNome")}
            placeholder="Loja principal"
          />
          <Field label="Seu nome" value={form.adminNome} onChange={update("adminNome")} required />
          <Field label="E-mail" type="email" value={form.email} onChange={update("email")} required autoComplete="email" />
          <Field
            label="Senha"
            type="password"
            value={form.senha}
            onChange={update("senha")}
            required
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres."
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar empresa"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
