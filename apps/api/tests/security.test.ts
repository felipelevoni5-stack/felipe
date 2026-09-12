import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./helpers.js";

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

async function createTenantWithAdmin(empresaNome: string, email: string) {
  await request(app).post("/api/auth/signup-empresa").send({
    empresaNome,
    adminNome: "Admin",
    email,
    senha: "senha12345",
  });
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, senha: "senha12345" });
  return loginRes.body.accessToken as string;
}

async function createOperador(adminToken: string, email: string) {
  const res = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Operador", email, senha: "senha12345", role: "OPERADOR" });
  return res;
}

describe("E-mail de usuário é único globalmente (não só por empresa)", () => {
  it("rejeita cadastro de empresa com e-mail já usado por outra empresa", async () => {
    await createTenantWithAdmin("Loja Sec1", "dono@sec1.com");

    const secondSignup = await request(app).post("/api/auth/signup-empresa").send({
      empresaNome: "Loja Sec1 Clone",
      adminNome: "Outro Admin",
      email: "dono@sec1.com",
      senha: "senha12345",
    });

    expect(secondSignup.status).toBe(409);
  });

  it("rejeita criação de usuário em empresa B com e-mail já usado em empresa A", async () => {
    await createTenantWithAdmin("Loja Sec2A", "compartilhado@sec2.com");
    const tokenB = await createTenantWithAdmin("Loja Sec2B", "admin@sec2b.com");

    const res = await createOperador(tokenB, "compartilhado@sec2.com");

    expect(res.status).toBe(409);
  });

  it("login autentica corretamente mesmo após tentativa de e-mail duplicado ser bloqueada", async () => {
    const tokenA = await createTenantWithAdmin("Loja Sec3A", "admin@sec3a.com");
    await createOperador(tokenA, "operador@sec3a.com");

    // Empresa B tenta (e falha) usar o mesmo e-mail do operador de A.
    const tokenB = await createTenantWithAdmin("Loja Sec3B", "admin@sec3b.com");
    await createOperador(tokenB, "operador@sec3a.com");

    // O operador legítimo de A ainda consegue logar normalmente na conta certa.
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "operador@sec3a.com", senha: "senha12345" });

    expect(login.status).toBe(200);
    expect(login.body.user.tenantId).not.toBe(undefined);
  });
});

describe("Auditoria — visualização de logs", () => {
  it("ADMIN vê os logs de auditoria da própria empresa", async () => {
    const token = await createTenantWithAdmin("Loja Sec4", "admin@sec4.com");

    const res = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs.some((l: { action: string }) => l.action === "SIGNUP_EMPRESA")).toBe(true);
  });

  it("GERENTE e OPERADOR não conseguem acessar os logs de auditoria", async () => {
    const adminToken = await createTenantWithAdmin("Loja Sec5", "admin@sec5.com");
    await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Gerente", email: "gerente@sec5.com", senha: "senha12345", role: "GERENTE" });
    const gerenteLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "gerente@sec5.com", senha: "senha12345" });

    const res = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", `Bearer ${gerenteLogin.body.accessToken}`);

    expect(res.status).toBe(403);
  });

  it("empresa A não vê logs de auditoria da empresa B", async () => {
    const tokenA = await createTenantWithAdmin("Loja Sec6A", "admin@sec6a.com");
    await createTenantWithAdmin("Loja Sec6B", "admin@sec6b.com");

    const res = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const emails = res.body.logs.map((l: { user: { email: string } | null }) => l.user?.email);
    expect(emails).not.toContain("admin@sec6b.com");
  });

  it("registra alteração de preço de produto na auditoria", async () => {
    const token = await createTenantWithAdmin("Loja Sec7", "admin@sec7.com");
    const productRes = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Produto Auditado", costPrice: 5, salePrice: 10, stockQuantity: 10, minStock: 1 });

    await request(app)
      .patch(`/api/products/${productRes.body.product.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ salePrice: 15 });

    const logs = await request(app)
      .get("/api/audit-logs?action=PRODUCT_PRICE_CHANGED")
      .set("Authorization", `Bearer ${token}`);

    expect(logs.body.logs).toHaveLength(1);
    expect(logs.body.logs[0].entityId).toBe(productRes.body.product.id);
  });
});

describe("Empresa nunca fica sem administrador ativo", () => {
  it("bloqueia desativar o último ADMIN", async () => {
    const token = await createTenantWithAdmin("Loja Sec8", "admin@sec8.com");
    const me = await request(app).get("/api/me").set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/users/${me.body.user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ active: false });

    expect(res.status).toBe(400);
  });

  it("bloqueia rebaixar o último ADMIN para GERENTE (sem precisar desativá-lo)", async () => {
    const token = await createTenantWithAdmin("Loja Sec9", "admin@sec9.com");
    const me = await request(app).get("/api/me").set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/users/${me.body.user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "GERENTE" });

    expect(res.status).toBe(400);
  });

  it("permite rebaixar um ADMIN quando existe outro ADMIN ativo", async () => {
    const token = await createTenantWithAdmin("Loja Sec10", "admin@sec10.com");
    const secondAdminRes = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Segundo Admin", email: "admin2@sec10.com", senha: "senha12345", role: "ADMIN" });

    const me = await request(app).get("/api/me").set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .patch(`/api/users/${me.body.user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "GERENTE" });

    expect(res.status).toBe(200);
    expect(secondAdminRes.status).toBe(201);
  });
});
