import { randomBytes, createHash } from "node:crypto";

// Tokens opacos (refresh token, reset de senha): o valor bruto vai para o cliente,
// só o hash SHA-256 fica no banco. Assim um vazamento do banco não expõe os tokens.
export function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashOpaqueToken(raw) };
}

export function hashOpaqueToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
