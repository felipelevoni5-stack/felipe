import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../api/auth";
import { ApiError } from "../../api/client";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
      setDevLink(res.devResetLink ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível processar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-slate-500">
          Informe seu e-mail para gerar um link de redefinição.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-slate-600">{message}</p>}
          {devLink && (
            <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              Ambiente de desenvolvimento — nenhum e-mail é enviado ainda. Link de teste:{" "}
              <Link to={devLink.replace(window.location.origin, "")} className="underline">
                {devLink}
              </Link>
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Gerar link de redefinição"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          <Link to="/login" className="text-blue-600 hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
