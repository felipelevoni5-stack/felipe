import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "../types/auth";
import * as authApi from "../api/auth";
import { tryRefresh } from "../api/client";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const refreshed = await tryRefresh();
      if (refreshed) {
        try {
          const me = await authApi.fetchMe();
          setUser(me);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email: string, senha: string) {
    const loggedUser = await authApi.login(email, senha);
    setUser(loggedUser);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  async function refreshUser() {
    const me = await authApi.fetchMe();
    setUser(me);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return ctx;
}
