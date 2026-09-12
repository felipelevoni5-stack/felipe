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
  await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Operador", email, senha: "senha12345", role: "OPERADOR" });
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, senha: "senha12345" });
  return loginRes.body.accessToken as string;
}

async function openCashSession(token: string, openingAmount = 100) {
  await request(app)
    .post("/api/cash/sessions")
    .set("Authorization", `Bearer ${token}`)
    .send({ openingAmount });
}

async function createProduct(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Produto", costPrice: 5, salePrice: 10, stockQuantity: 2, minStock: 1, ...overrides });
  return res.body.product as { id: string };
}

describe("Configurações da empresa", () => {
  it("ADMIN atualiza nome, CNPJ, estoque negativo e limite de desconto", async () => {
    const token = await createTenantWithAdmin("Loja Config1", "admin@config1.com");

    const res = await request(app)
      .patch("/api/tenant")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Loja Config1 Renomeada",
        document: "12.345.678/0001-90",
        allowNegativeStock: true,
        operatorMaxDiscountPercent: 10,
      });

    expect(res.status).toBe(200);
    expect(res.body.tenant.name).toBe("Loja Config1 Renomeada");
    expect(res.body.tenant.document).toBe("12.345.678/0001-90");
    expect(res.body.tenant.allowNegativeStock).toBe(true);
    expect(res.body.tenant.operatorMaxDiscountPercent).toBe("10");
  });

  it("GERENTE e OPERADOR não podem alterar configurações", async () => {
    const adminToken = await createTenantWithAdmin("Loja Config2", "admin@config2.com");
    await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Gerente", email: "gerente@config2.com", senha: "senha12345", role: "GERENTE" });
    const gerenteLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "gerente@config2.com", senha: "senha12345" });

    const res = await request(app)
      .patch("/api/tenant")
      .set("Authorization", `Bearer ${gerenteLogin.body.accessToken}`)
      .send({ allowNegativeStock: true });

    expect(res.status).toBe(403);
  });

  it("rejeita limite de desconto fora do intervalo 0-100", async () => {
    const token = await createTenantWithAdmin("Loja Config3", "admin@config3.com");

    const res = await request(app)
      .patch("/api/tenant")
      .set("Authorization", `Bearer ${token}`)
      .send({ operatorMaxDiscountPercent: 150 });

    expect(res.status).toBe(400);
  });

  it("habilitar estoque negativo passa a permitir vendas acima do estoque disponível", async () => {
    const token = await createTenantWithAdmin("Loja Config4", "admin@config4.com");
    await openCashSession(token);
    const product = await createProduct(token, { stockQuantity: 2 });

    const blocked = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 5 }], payments: [{ method: "DINHEIRO", amount: 50 }] });
    expect(blocked.status).toBe(400);

    await request(app)
      .patch("/api/tenant")
      .set("Authorization", `Bearer ${token}`)
      .send({ allowNegativeStock: true });

    const allowed = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 5 }], payments: [{ method: "DINHEIRO", amount: 50 }] });
    expect(allowed.status).toBe(201);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updatedProduct?.stockQuantity.toString()).toBe("-3");
  });

  it("aumentar o limite de desconto do operador passa a permitir o desconto que antes era bloqueado", async () => {
    const adminToken = await createTenantWithAdmin("Loja Config5", "admin@config5.com");
    const operadorToken = await createOperador(adminToken, "operador@config5.com");
    await openCashSession(adminToken);
    const product = await createProduct(adminToken, { salePrice: 100, stockQuantity: 10 });

    const blocked = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({
        items: [{ productId: product.id, quantity: 1, discount: 10 }],
        payments: [{ method: "DINHEIRO", amount: 90 }],
      });
    expect(blocked.status).toBe(403);

    await request(app)
      .patch("/api/tenant")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ operatorMaxDiscountPercent: 15 });

    const allowed = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({
        items: [{ productId: product.id, quantity: 1, discount: 10 }],
        payments: [{ method: "DINHEIRO", amount: 90 }],
      });
    expect(allowed.status).toBe(201);
  });

  it("registra a alteração de configurações na auditoria", async () => {
    const token = await createTenantWithAdmin("Loja Config6", "admin@config6.com");

    await request(app)
      .patch("/api/tenant")
      .set("Authorization", `Bearer ${token}`)
      .send({ allowNegativeStock: true });

    const logs = await request(app)
      .get("/api/audit-logs?action=TENANT_SETTINGS_UPDATED")
      .set("Authorization", `Bearer ${token}`);

    expect(logs.body.logs).toHaveLength(1);
  });
});
