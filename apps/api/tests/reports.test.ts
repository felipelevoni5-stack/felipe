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
    .send({ name: "Produto", costPrice: 5, salePrice: 10, stockQuantity: 50, minStock: 5, ...overrides });
  return res.body.product as { id: string };
}

describe("Acesso aos relatórios", () => {
  it("OPERADOR não tem acesso a relatórios", async () => {
    const adminToken = await createTenantWithAdmin("Loja Rel1", "admin@rel1.com");
    const operadorToken = await createOperador(adminToken, "operador@rel1.com");

    const res = await request(app)
      .get("/api/reports/sales-summary")
      .set("Authorization", `Bearer ${operadorToken}`);

    expect(res.status).toBe(403);
  });
});

describe("Relatório de vendas", () => {
  it("calcula total vendido, quantidade e ticket médio corretamente", async () => {
    const token = await createTenantWithAdmin("Loja Rel2", "admin@rel2.com");
    await openCashSession(token);
    const productA = await createProduct(token, { name: "Produto A", salePrice: 10 });
    const productB = await createProduct(token, { name: "Produto B", salePrice: 30 });

    await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: productA.id, quantity: 1 }], payments: [{ method: "DINHEIRO", amount: 10 }] });
    await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: productB.id, quantity: 1 }], payments: [{ method: "PIX", amount: 30 }] });

    const res = await request(app)
      .get("/api/reports/sales-summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.totalVendido).toBe("40");
    expect(res.body.summary.quantidadeVendas).toBe(2);
    expect(res.body.summary.ticketMedio).toBe("20");
  });

  it("não conta venda cancelada no total vendido, mas soma em vendas canceladas", async () => {
    const token = await createTenantWithAdmin("Loja Rel3", "admin@rel3.com");
    await openCashSession(token);
    const product = await createProduct(token, { salePrice: 10, stockQuantity: 10 });

    const saleRes = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1 }], payments: [{ method: "DINHEIRO", amount: 10 }] });

    await request(app)
      .post(`/api/sales/${saleRes.body.sale.id}/cancel`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "teste" });

    const res = await request(app)
      .get("/api/reports/sales-summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.summary.totalVendido).toBe("0");
    expect(res.body.summary.quantidadeVendas).toBe(0);
    expect(res.body.summary.vendasCanceladas).toBe(1);
    expect(res.body.summary.totalCancelado).toBe("10");
  });

  it("filtra por período (from/to)", async () => {
    const token = await createTenantWithAdmin("Loja Rel4", "admin@rel4.com");
    await openCashSession(token);
    const product = await createProduct(token, { salePrice: 10 });
    await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 1 }], payments: [{ method: "DINHEIRO", amount: 10 }] });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const withinRange = await request(app)
      .get(`/api/reports/sales-summary?from=${yesterday}&to=${tomorrow}`)
      .set("Authorization", `Bearer ${token}`);
    expect(withinRange.body.summary.quantidadeVendas).toBe(1);

    const outsideRange = await request(app)
      .get(`/api/reports/sales-summary?from=${tomorrow}`)
      .set("Authorization", `Bearer ${token}`);
    expect(outsideRange.body.summary.quantidadeVendas).toBe(0);
  });
});

describe("Produtos mais vendidos", () => {
  it("ordena por quantidade vendida", async () => {
    const token = await createTenantWithAdmin("Loja Rel5", "admin@rel5.com");
    await openCashSession(token);
    const popular = await createProduct(token, { name: "Popular", salePrice: 5, stockQuantity: 100 });
    const unpopular = await createProduct(token, { name: "Impopular", salePrice: 5, stockQuantity: 100 });

    await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          { productId: popular.id, quantity: 10 },
          { productId: unpopular.id, quantity: 1 },
        ],
        payments: [{ method: "DINHEIRO", amount: 55 }],
      });

    const res = await request(app)
      .get("/api/reports/top-products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.products[0].name).toBe("Popular");
    expect(res.body.products[0].quantity).toBe("10");
  });
});

describe("Relatório financeiro (pagamentos e caixa)", () => {
  it("soma corretamente por forma de pagamento e lista fechamentos", async () => {
    const token = await createTenantWithAdmin("Loja Rel6", "admin@rel6.com");
    const openRes = await request(app)
      .post("/api/cash/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ openingAmount: 100 });
    const product = await createProduct(token, { salePrice: 10 });

    await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        payments: [
          { method: "DINHEIRO", amount: 5 },
          { method: "PIX", amount: 5 },
        ],
      });

    await request(app)
      .post(`/api/cash/sessions/${openRes.body.session.id}/close`)
      .set("Authorization", `Bearer ${token}`)
      .send({ countedCash: 105 });

    const res = await request(app)
      .get("/api/reports/payments")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.report.totals.DINHEIRO).toBe("5");
    expect(res.body.report.totals.PIX).toBe("5");
    expect(res.body.report.fechamentos).toHaveLength(1);
    expect(res.body.report.fechamentos[0].difference).toBe("0");
  });
});

describe("Relatório de estoque", () => {
  it("lista produtos com estoque baixo/zerado e calcula valor total em estoque", async () => {
    const token = await createTenantWithAdmin("Loja Rel7", "admin@rel7.com");
    await createProduct(token, { name: "Normal", costPrice: 2, salePrice: 5, stockQuantity: 20, minStock: 5 });
    await createProduct(token, { name: "Baixo", costPrice: 2, salePrice: 5, stockQuantity: 3, minStock: 5 });
    await createProduct(token, { name: "Zerado", costPrice: 2, salePrice: 5, stockQuantity: 0, minStock: 5 });

    const res = await request(app).get("/api/reports/stock").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.report.lowStock.map((p: { name: string }) => p.name)).toEqual(["Baixo"]);
    expect(res.body.report.outOfStock.map((p: { name: string }) => p.name)).toEqual(["Zerado"]);
    expect(res.body.report.stockValueCost).toBe("46"); // 20*2 + 3*2 + 0*2
  });
});
