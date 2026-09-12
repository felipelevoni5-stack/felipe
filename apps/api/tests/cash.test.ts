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

async function createProduct(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Produto", costPrice: 5, salePrice: 10, stockQuantity: 50, minStock: 5, ...overrides });
  return res.body.product as { id: string };
}

describe("Abertura de caixa", () => {
  it("abre o caixa com sucesso", async () => {
    const token = await createTenantWithAdmin("Loja Caixa1", "admin@caixa1.com");

    const res = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 200 });

    expect(res.status).toBe(201);
    expect(res.body.session.status).toBe("ABERTO");
    expect(res.body.session.openingAmount).toBe("200");
  });

  it("bloqueia abertura de caixa duplicado", async () => {
    const token = await createTenantWithAdmin("Loja Caixa2", "admin@caixa2.com");
    await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });

    const second = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });

    expect(second.status).toBe(409);
  });

  it("OPERADOR consegue abrir o caixa", async () => {
    const adminToken = await createTenantWithAdmin("Loja Caixa3", "admin@caixa3.com");
    const operadorToken = await createOperador(adminToken, "operador@caixa3.com");

    const res = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({ openingAmount: 50 });

    expect(res.status).toBe(201);
  });
});

describe("Vendas exigem caixa aberto", () => {
  it("rejeita venda quando não há caixa aberto", async () => {
    const token = await createTenantWithAdmin("Loja Caixa4", "admin@caixa4.com");
    const product = await createProduct(token);

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        payments: [{ method: "DINHEIRO", amount: 10 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/caixa/i);
  });
});

describe("Sangria e suprimento", () => {
  it("registra sangria e suprimento vinculados à sessão", async () => {
    const token = await createTenantWithAdmin("Loja Caixa5", "admin@caixa5.com");
    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });
    const sessionId = openRes.body.session.id;

    const sangria = await request(app)
      .post(`/api/cash/sessions/${sessionId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "SANGRIA", amount: 30, reason: "Depósito no banco" });
    expect(sangria.status).toBe(201);

    const suprimento = await request(app)
      .post(`/api/cash/sessions/${sessionId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "SUPRIMENTO", amount: 20, reason: "Troco adicional" });
    expect(suprimento.status).toBe(201);

    const current = await request(app)
      .get("/api/cash/sessions/current")
      .set("Authorization", `Bearer ${token}`);
    expect(current.body.session.movements).toHaveLength(2);
  });

  it("exige motivo e valor positivo para sangria/suprimento", async () => {
    const token = await createTenantWithAdmin("Loja Caixa6", "admin@caixa6.com");
    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });

    const res = await request(app)
      .post(`/api/cash/sessions/${openRes.body.session.id}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "SANGRIA", amount: -10, reason: "" });

    expect(res.status).toBe(400);
  });

  it("um operador não pode lançar movimento no caixa aberto por outro operador", async () => {
    const adminToken = await createTenantWithAdmin("Loja Caixa7", "admin@caixa7.com");
    const operadorA = await createOperador(adminToken, "operadorA@caixa7.com");
    const operadorB = await createOperador(adminToken, "operadorB@caixa7.com");

    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${operadorA}`)
      .send({ openingAmount: 100 });

    const res = await request(app)
      .post(`/api/cash/sessions/${openRes.body.session.id}/movements`)
      .set("Authorization", `Bearer ${operadorB}`)
      .send({ type: "SANGRIA", amount: 10, reason: "teste" });

    expect(res.status).toBe(403);
  });

  it("ADMIN pode lançar movimento no caixa aberto por um operador", async () => {
    const adminToken = await createTenantWithAdmin("Loja Caixa8", "admin@caixa8.com");
    const operador = await createOperador(adminToken, "operador@caixa8.com");

    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${operador}`)
      .send({ openingAmount: 100 });

    const res = await request(app)
      .post(`/api/cash/sessions/${openRes.body.session.id}/movements`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "SUPRIMENTO", amount: 10, reason: "reforço" });

    expect(res.status).toBe(201);
  });
});

describe("Fechamento de caixa", () => {
  it("fecha sem diferença quando o valor contado bate com o esperado", async () => {
    const token = await createTenantWithAdmin("Loja Caixa9", "admin@caixa9.com");
    const product = await createProduct(token, { salePrice: 10, stockQuantity: 10 });

    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });

    await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 2 }],
        payments: [{ method: "DINHEIRO", amount: 20 }],
      });

    // esperado: 100 (fundo) + 20 (venda em dinheiro) - 0 (troco) = 120
    const closeRes = await request(app)
      .post(`/api/cash/sessions/${openRes.body.session.id}/close`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedCash: 120 });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.session.status).toBe("FECHADO");
    expect(closeRes.body.session.expectedCash).toBe("120");
    expect(closeRes.body.session.difference).toBe("0");
    expect(closeRes.body.session.totalDinheiro).toBe("20");
  });

  it("exige justificativa quando há diferença entre o valor contado e o esperado", async () => {
    const token = await createTenantWithAdmin("Loja Caixa10", "admin@caixa10.com");
    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });

    const withoutJustification = await request(app)
      .post(`/api/cash/sessions/${openRes.body.session.id}/close`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedCash: 90 });
    expect(withoutJustification.status).toBe(400);

    const withJustification = await request(app)
      .post(`/api/cash/sessions/${openRes.body.session.id}/close`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedCash: 90, justification: "Troco pago errado numa venda" });
    expect(withJustification.status).toBe(200);
    expect(withJustification.body.session.difference).toBe("-10");
  });

  it("considera sangria e suprimento no valor esperado do fechamento", async () => {
    const token = await createTenantWithAdmin("Loja Caixa11", "admin@caixa11.com");
    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });
    const sessionId = openRes.body.session.id;

    await request(app)
      .post(`/api/cash/sessions/${sessionId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "SANGRIA", amount: 40, reason: "depósito" });
    await request(app)
      .post(`/api/cash/sessions/${sessionId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "SUPRIMENTO", amount: 15, reason: "reforço" });

    // esperado: 100 - 40 + 15 = 75
    const closeRes = await request(app)
      .post(`/api/cash/sessions/${sessionId}/close`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedCash: 75 });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.session.expectedCash).toBe("75");
    expect(closeRes.body.session.difference).toBe("0");
  });

  it("não permite fechar o mesmo caixa duas vezes nem lançar movimento após fechado", async () => {
    const token = await createTenantWithAdmin("Loja Caixa12", "admin@caixa12.com");
    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });
    const sessionId = openRes.body.session.id;

    await request(app)
      .post(`/api/cash/sessions/${sessionId}/close`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedCash: 100 });

    const secondClose = await request(app)
      .post(`/api/cash/sessions/${sessionId}/close`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedCash: 100 });
    expect(secondClose.status).toBe(400);

    const movementAfterClose = await request(app)
      .post(`/api/cash/sessions/${sessionId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "SANGRIA", amount: 10, reason: "teste" });
    expect(movementAfterClose.status).toBe(400);
  });

  it("permite abrir um novo caixa depois que o anterior foi fechado", async () => {
    const token = await createTenantWithAdmin("Loja Caixa13", "admin@caixa13.com");
    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });

    await request(app)
      .post(`/api/cash/sessions/${openRes.body.session.id}/close`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedCash: 100 });

    const reopen = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });
    expect(reopen.status).toBe(201);
  });
});
