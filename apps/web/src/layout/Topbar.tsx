import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/auth";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  OPERADOR: "Operador de caixa",
};

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right text-sm">
            <p className="font-medium text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-400">{roleLabels[user.role]}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
