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

describe("Cadastro de clientes", () => {
  it("cria cliente com apenas o nome (demais campos opcionais)", async () => {
    const token = await createTenantWithAdmin("Loja Cliente1", "admin@cliente1.com");

    const res = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "João da Silva" });

    expect(res.status).toBe(201);
    expect(res.body.customer.name).toBe("João da Silva");
    expect(res.body.customer.phone).toBeNull();
  });

  it("OPERADOR também pode cadastrar clientes (não é operação restrita)", async () => {
    const adminToken = await createTenantWithAdmin("Loja Cliente2", "admin@cliente2.com");
    const operadorToken = await createOperador(adminToken, "operador@cliente2.com");

    const res = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({ name: "Cliente do Operador" });

    expect(res.status).toBe(201);
  });

  it("empresa A não vê clientes da empresa B", async () => {
    const tokenA = await createTenantWithAdmin("Loja Cliente3A", "admin@cliente3a.com");
    const tokenB = await createTenantWithAdmin("Loja Cliente3B", "admin@cliente3b.com");

    await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "Cliente Exclusivo B" });

    const listA = await request(app).get("/api/customers").set("Authorization", `Bearer ${tokenA}`);
    expect(listA.body.customers).toHaveLength(0);
  });
});

describe("Venda com cliente vinculado", () => {
  it("registra a venda com o cliente selecionado e mantém histórico de compras", async () => {
    const token = await createTenantWithAdmin("Loja Cliente4", "admin@cliente4.com");
    await openCashSession(token);
    const product = await createProduct(token, { salePrice: 10 });
    const customerRes = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Cliente Fiel" });
    const customerId = customerRes.body.customer.id;

    const saleRes = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        payments: [{ method: "DINHEIRO", amount: 10 }],
        customerId,
      });
    expect(saleRes.status).toBe(201);
    expect(saleRes.body.sale.customer.id).toBe(customerId);

    const history = await request(app)
      .get(`/api/customers/${customerId}/history`)
      .set("Authorization", `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body.sales).toHaveLength(1);
  });

  it("venda sem cliente selecionado continua funcionando normalmente", async () => {
    const token = await createTenantWithAdmin("Loja Cliente5", "admin@cliente5.com");
    await openCashSession(token);
    const product = await createProduct(token, { salePrice: 10 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
        payments: [{ method: "DINHEIRO", amount: 10 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.sale.customer).toBeNull();
  });

  it("OPERADOR não consegue ver o histórico de compras de um cliente", async () => {
    const adminToken = await createTenantWithAdmin("Loja Cliente6", "admin@cliente6.com");
    const operadorToken = await createOperador(adminToken, "operador@cliente6.com");
    const customerRes = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Cliente X" });

    const res = await request(app)
      .get(`/api/customers/${customerRes.body.customer.id}/history`)
      .set("Authorization", `Bearer ${operadorToken}`);

    expect(res.status).toBe(403);
  });
});
