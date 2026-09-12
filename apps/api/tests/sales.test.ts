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

async function createProduct(
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; name: string; salePrice: string }> {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Produto Venda",
      costPrice: 5,
      salePrice: 10,
      stockQuantity: 50,
      minStock: 5,
      ...overrides,
    });
  return res.body.product;
}

describe("Busca de produto por código (leitor de código de barras)", () => {
  it("encontra produto existente e retorna 404 para inexistente", async () => {
    const adminToken = await createTenantWithAdmin("Loja Lookup", "admin@lookup.com");
    await openCashSession(adminToken);
    await createProduct(adminToken, { barcode: "123456" });

    const found = await request(app)
      .get("/api/products/lookup?code=123456")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(found.status).toBe(200);
    expect(found.body.product.name).toBe("Produto Venda");

    const notFound = await request(app)
      .get("/api/products/lookup?code=000000")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(notFound.status).toBe(404);
  });
});

describe("Criação de venda", () => {
  it("venda com vários itens calcula subtotal e total corretamente", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda1", "admin@venda1.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { name: "Produto A", salePrice: 10, stockQuantity: 20 });
    const p2 = await createProduct(adminToken, { name: "Produto B", salePrice: 5, stockQuantity: 20 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [
          { productId: p1.id, quantity: 2 },
          { productId: p2.id, quantity: 3 },
        ],
        payments: [{ method: "DINHEIRO", amount: 35 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.sale.subtotal).toBe("35");
    expect(res.body.sale.total).toBe("35");
    expect(res.body.sale.changeAmount).toBe("0");
    expect(res.body.sale.items).toHaveLength(2);
  });

  it("calcula troco corretamente em pagamento em dinheiro", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda2", "admin@venda2.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 9.9 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1 }],
        payments: [{ method: "DINHEIRO", amount: 20 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.sale.total).toBe("9.9");
    expect(res.body.sale.changeAmount).toBe("10.1");
  });

  it("rejeita pagamento em dinheiro insuficiente", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda3", "admin@venda3.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 10 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1 }],
        payments: [{ method: "DINHEIRO", amount: 5 }],
      });

    expect(res.status).toBe(400);
  });

  it("aceita Pix e cartão apenas registrando a forma de pagamento", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda4", "admin@venda4.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 10 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1 }],
        payments: [{ method: "PIX", amount: 10 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.sale.payments[0].method).toBe("PIX");
  });

  it("permite pagamento dividido entre dinheiro e Pix", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda5", "admin@venda5.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 100 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1 }],
        payments: [
          { method: "DINHEIRO", amount: 50 },
          { method: "PIX", amount: 50 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.sale.payments).toHaveLength(2);
    expect(res.body.sale.changeAmount).toBe("0");
  });

  it("rejeita pagamento em cartão/Pix acima do total (sem troco possível)", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda6", "admin@venda6.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 10 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1 }],
        payments: [{ method: "PIX", amount: 20 }],
      });

    expect(res.status).toBe(400);
  });

  it("bloqueia venda sem estoque suficiente quando estoque negativo não é permitido", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda7", "admin@venda7.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 10, stockQuantity: 2 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 5 }],
        payments: [{ method: "DINHEIRO", amount: 50 }],
      });

    expect(res.status).toBe(400);

    const product = await prisma.product.findUnique({ where: { id: p1.id } });
    expect(product?.stockQuantity.toString()).toBe("2");
  });

  it("baixa o estoque corretamente ao concluir a venda e vincula o movimento à venda", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda8", "admin@venda8.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 10, stockQuantity: 10 });

    const saleRes = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 3 }],
        payments: [{ method: "DINHEIRO", amount: 30 }],
      });

    const product = await prisma.product.findUnique({ where: { id: p1.id } });
    expect(product?.stockQuantity.toString()).toBe("7");

    const movements = await prisma.stockMovement.findMany({ where: { productId: p1.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe("VENDA");
    expect(movements[0].saleId).toBe(saleRes.body.sale.id);
  });

  it("desconto de OPERADOR acima do limite configurado é bloqueado", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda9", "admin@venda9.com");
    await openCashSession(adminToken);
    const operadorToken = await createOperador(adminToken, "operador@venda9.com");
    const p1 = await createProduct(adminToken, { salePrice: 100 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1, discount: 10 }],
        payments: [{ method: "DINHEIRO", amount: 90 }],
      });

    expect(res.status).toBe(403);
  });

  it("ADMIN pode aplicar desconto sem limite configurado para operador", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda10", "admin@venda10.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 100 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1, discount: 30 }],
        payments: [{ method: "DINHEIRO", amount: 70 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.sale.total).toBe("70");
  });

  it("duplo clique com a mesma chave de idempotência não duplica a venda", async () => {
    const adminToken = await createTenantWithAdmin("Loja Venda11", "admin@venda11.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 10, stockQuantity: 10 });

    const payload = {
      items: [{ productId: p1.id, quantity: 1 }],
      payments: [{ method: "DINHEIRO", amount: 10 }],
      clientRequestId: "chave-fixa-teste-123",
    };

    const [res1, res2] = await Promise.all([
      request(app).post("/api/sales").set("Authorization", `Bearer ${adminToken}`).send(payload),
      request(app).post("/api/sales").set("Authorization", `Bearer ${adminToken}`).send(payload),
    ]);

    expect(res1.body.sale.id).toBe(res2.body.sale.id);

    const sales = await prisma.sale.findMany({ where: { clientRequestId: "chave-fixa-teste-123" } });
    expect(sales).toHaveLength(1);

    const product = await prisma.product.findUnique({ where: { id: p1.id } });
    expect(product?.stockQuantity.toString()).toBe("9");
  });

  it("empresa A não vê nem cancela venda da empresa B", async () => {
    const tokenA = await createTenantWithAdmin("Loja Venda12A", "admin@venda12a.com");
    await openCashSession(tokenA);
    const tokenB = await createTenantWithAdmin("Loja Venda12B", "admin@venda12b.com");
    await openCashSession(tokenB);
    const productB = await createProduct(tokenB, { salePrice: 10 });

    const saleB = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        items: [{ productId: productB.id, quantity: 1 }],
        payments: [{ method: "DINHEIRO", amount: 10 }],
      });

    const getFromA = await request(app)
      .get(`/api/sales/${saleB.body.sale.id}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(getFromA.status).toBe(404);

    const cancelFromA = await request(app)
      .post(`/api/sales/${saleB.body.sale.id}/cancel`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ reason: "tentativa indevida" });
    expect(cancelFromA.status).toBe(404);
  });
});

describe("Cancelamento de venda", () => {
  it("ADMIN cancela venda, devolve estoque e mantém a venda no histórico", async () => {
    const adminToken = await createTenantWithAdmin("Loja Cancel1", "admin@cancel1.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 10, stockQuantity: 10 });

    const saleRes = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 4 }],
        payments: [{ method: "DINHEIRO", amount: 40 }],
      });

    let product = await prisma.product.findUnique({ where: { id: p1.id } });
    expect(product?.stockQuantity.toString()).toBe("6");

    const cancelRes = await request(app)
      .post(`/api/sales/${saleRes.body.sale.id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Cliente desistiu" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.sale.status).toBe("CANCELADA");

    product = await prisma.product.findUnique({ where: { id: p1.id } });
    expect(product?.stockQuantity.toString()).toBe("10");

    const stillThere = await request(app)
      .get(`/api/sales/${saleRes.body.sale.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.sale.status).toBe("CANCELADA");
  });

  it("OPERADOR não consegue cancelar venda", async () => {
    const adminToken = await createTenantWithAdmin("Loja Cancel2", "admin@cancel2.com");
    await openCashSession(adminToken);
    const operadorToken = await createOperador(adminToken, "operador@cancel2.com");
    const p1 = await createProduct(adminToken, { salePrice: 10, stockQuantity: 10 });

    const saleRes = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1 }],
        payments: [{ method: "DINHEIRO", amount: 10 }],
      });

    const cancelRes = await request(app)
      .post(`/api/sales/${saleRes.body.sale.id}/cancel`)
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({ reason: "teste" });

    expect(cancelRes.status).toBe(403);
  });

  it("não permite cancelar a mesma venda duas vezes", async () => {
    const adminToken = await createTenantWithAdmin("Loja Cancel3", "admin@cancel3.com");
    await openCashSession(adminToken);
    const p1 = await createProduct(adminToken, { salePrice: 10, stockQuantity: 10 });

    const saleRes = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ productId: p1.id, quantity: 1 }],
        payments: [{ method: "DINHEIRO", amount: 10 }],
      });

    await request(app)
      .post(`/api/sales/${saleRes.body.sale.id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "primeiro cancelamento" });

    const second = await request(app)
      .post(`/api/sales/${saleRes.body.sale.id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "segundo cancelamento" });

    expect(second.status).toBe(400);
  });
});
