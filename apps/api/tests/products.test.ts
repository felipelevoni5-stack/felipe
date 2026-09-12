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

describe("Categorias", () => {
  it("ADMIN cria categoria; OPERADOR não consegue", async () => {
    const adminToken = await createTenantWithAdmin("Loja Cat", "admin@cat.com");
    const operadorToken = await createOperador(adminToken, "operador@cat.com");

    const created = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bebidas" });
    expect(created.status).toBe(201);

    const blocked = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({ name: "Limpeza" });
    expect(blocked.status).toBe(403);

    const list = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${operadorToken}`);
    expect(list.status).toBe(200);
    expect(list.body.categories).toHaveLength(1);
  });

  it("rejeita categoria com nome duplicado na mesma empresa", async () => {
    const adminToken = await createTenantWithAdmin("Loja Cat2", "admin@cat2.com");
    await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bebidas" });

    const dup = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bebidas" });
    expect(dup.status).toBe(409);
  });
});

describe("Produtos", () => {
  it("cria produto com sucesso e valida campos obrigatórios", async () => {
    const adminToken = await createTenantWithAdmin("Loja Prod", "admin@prod.com");

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Refrigerante 2L",
        barcode: "7891000100103",
        costPrice: 5.5,
        salePrice: 9.9,
        stockQuantity: 20,
        minStock: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.product.name).toBe("Refrigerante 2L");
    expect(res.body.product.stockQuantity).toBe("20");
  });

  it("rejeita código de barras duplicado na mesma empresa", async () => {
    const adminToken = await createTenantWithAdmin("Loja Prod2", "admin@prod2.com");
    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Produto A", barcode: "111", costPrice: 1, salePrice: 2 });

    const dup = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Produto B", barcode: "111", costPrice: 1, salePrice: 2 });

    expect(dup.status).toBe(409);
  });

  it("OPERADOR não consegue criar produto, mas consegue listar", async () => {
    const adminToken = await createTenantWithAdmin("Loja Prod3", "admin@prod3.com");
    const operadorToken = await createOperador(adminToken, "operador@prod3.com");

    const blocked = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({ name: "Produto C", costPrice: 1, salePrice: 2 });
    expect(blocked.status).toBe(403);

    const list = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${operadorToken}`);
    expect(list.status).toBe(200);
  });

  it("empresa A não vê produtos da empresa B", async () => {
    const tokenA = await createTenantWithAdmin("Loja A", "admin@lojaa.com");
    const tokenB = await createTenantWithAdmin("Loja B", "admin@lojab.com");

    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "Produto exclusivo B", costPrice: 1, salePrice: 2 });

    const listA = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(listA.body.products).toHaveLength(0);
  });
});

describe("Movimentações de estoque", () => {
  async function createProduct(token: string, overrides: Record<string, unknown> = {}) {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Produto Estoque",
        costPrice: 1,
        salePrice: 2,
        stockQuantity: 10,
        minStock: 3,
        ...overrides,
      });
    return res.body.product as { id: string };
  }

  it("entrada aumenta o estoque e registra o movimento", async () => {
    const adminToken = await createTenantWithAdmin("Loja Estoque1", "admin@estoque1.com");
    const product = await createProduct(adminToken);

    const res = await request(app)
      .post(`/api/products/${product.id}/stock-movements`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "ENTRADA", quantity: 5 });

    expect(res.status).toBe(201);
    expect(res.body.movement.newQuantity).toBe("15");

    const updated = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(updated.body.product.stockQuantity).toBe("15");
    expect(updated.body.product.status).toBe("NORMAL");
  });

  it("saída maior que o estoque é bloqueada quando estoque negativo não é permitido", async () => {
    const adminToken = await createTenantWithAdmin("Loja Estoque2", "admin@estoque2.com");
    const product = await createProduct(adminToken, { stockQuantity: 3 });

    const res = await request(app)
      .post(`/api/products/${product.id}/stock-movements`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "SAIDA", quantity: 10, reason: "Venda" });

    expect(res.status).toBe(400);
  });

  it("ajuste de inventário define a quantidade e calcula o delta corretamente", async () => {
    const adminToken = await createTenantWithAdmin("Loja Estoque3", "admin@estoque3.com");
    const product = await createProduct(adminToken, { stockQuantity: 10 });

    const res = await request(app)
      .post(`/api/products/${product.id}/stock-movements`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "AJUSTE", newQuantity: 7 });

    expect(res.status).toBe(201);
    expect(res.body.movement.quantity).toBe("-3");
    expect(res.body.movement.newQuantity).toBe("7");
  });

  it("estoque baixo aparece marcado corretamente e some após reposição", async () => {
    const adminToken = await createTenantWithAdmin("Loja Estoque4", "admin@estoque4.com");
    const product = await createProduct(adminToken, { stockQuantity: 2, minStock: 5 });

    const listLow = await request(app)
      .get("/api/products?lowStock=true")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listLow.body.products.map((p: { id: string }) => p.id)).toContain(product.id);

    await request(app)
      .post(`/api/products/${product.id}/stock-movements`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "ENTRADA", quantity: 20 });

    const listAfter = await request(app)
      .get("/api/products?lowStock=true")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listAfter.body.products.map((p: { id: string }) => p.id)).not.toContain(product.id);
  });

  it("OPERADOR não consegue registrar movimentação de estoque", async () => {
    const adminToken = await createTenantWithAdmin("Loja Estoque5", "admin@estoque5.com");
    const operadorToken = await createOperador(adminToken, "operador@estoque5.com");
    const product = await createProduct(adminToken);

    const res = await request(app)
      .post(`/api/products/${product.id}/stock-movements`)
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({ type: "ENTRADA", quantity: 5 });

    expect(res.status).toBe(403);
  });
});
