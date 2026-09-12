const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

// O access token vive só em memória (não em localStorage) para reduzir exposição a XSS.
// O refresh token fica em cookie httpOnly, gerenciado pelo backend.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  skipRefreshRetry?: boolean;
};

async function rawRequest(path: string, options: RequestOptions = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  return res;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options);

  if (res.status === 401 && !options.skipRefreshRetry && path !== "/api/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path, options);
    }
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? "Erro inesperado.", data?.details);
  }

  return data as T;
}

export async function tryRefresh(): Promise<boolean> {
  try {
    const res = await rawRequest("/api/auth/refresh", { method: "POST", skipRefreshRetry: true });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}
