import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { createUser, listUsers, updateUser, type TenantUser } from "../../api/users";
import { ApiError } from "../../api/client";
import type { Role } from "../../types/auth";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  OPERADOR: "Operador de caixa",
};

export function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch {
      setError("Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleActive(u: TenantUser) {
    try {
      await updateUser(u.id, { active: !u.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o usuário.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Usuários e permissões</h1>
          <p className="mt-1 text-sm text-slate-500">Gerencie quem tem acesso ao sistema.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? "Cancelar" : "Novo usuário"}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <NewUserForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-slate-500">{roleLabels[u.role]}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {u.active ? "Desativar" : "Ativar"}
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

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<Role>("OPERADOR");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createUser({ name, email, senha, role });
      setName("");
      setEmail("");
      setSenha("");
      setRole("OPERADOR");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input
        required
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        required
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        required
        type="password"
        placeholder="Senha provisória"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="OPERADOR">Operador de caixa</option>
        <option value="GERENTE">Gerente</option>
        <option value="ADMIN">Administrador</option>
      </select>

      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="col-span-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-1"
      >
        {submitting ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}
