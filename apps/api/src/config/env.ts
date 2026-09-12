import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  // Só habilite atrás de um proxy reverso confiável (Vercel, nginx, etc). Se ligado
  // sem um proxy real na frente, o cliente pode forjar seu próprio IP via cabeçalho
  // X-Forwarded-For e burlar o rate limiting e os registros de auditoria.
  trustProxy: process.env.TRUST_PROXY === "true",
};
