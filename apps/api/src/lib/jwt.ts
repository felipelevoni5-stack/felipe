import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AccessTokenPayload = {
  sub: string;
  tenantId: string;
  storeId: string | null;
  role: "ADMIN" | "GERENTE" | "OPERADOR";
};

const ACCESS_TOKEN_TTL = "15m";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}
