import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/auth";

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
