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

describe("POST /api/auth/signup-empresa", () => {
  it("cria empresa, loja padrão e usuário admin", async () => {
    const res = await request(app).post("/api/auth/signup-empresa").send({
      empresaNome: "Loja da Maria",
      adminNome: "Maria Souza",
      email: "maria@loja.com",
      senha: "senha12345",
    });

    expect(res.status).toBe(201);
    expect(res.body.tenant.name).toBe("Loja da Maria");
    expect(res.body.store.name).toBe("Loja principal");
    expect(res.body.user.role).toBe("ADMIN");

    const store = await prisma.store.findFirst({ where: { tenantId: res.body.tenant.id } });
    expect(store).not.toBeNull();
  });

  it("rejeita e-mail duplicado", async () => {
    await request(app).post("/api/auth/signup-empresa").send({
      empresaNome: "Loja A",
      adminNome: "Admin A",
      email: "duplicado@loja.com",
      senha: "senha12345",
    });

    const res = await request(app).post("/api/auth/signup-empresa").send({
      empresaNome: "Loja B",
      adminNome: "Admin B",
      email: "duplicado@loja.com",
      senha: "senha12345",
    });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/signup-empresa").send({
      empresaNome: "Loja Teste",
      adminNome: "Admin Teste",
      email: "admin@teste.com",
      senha: "senha12345",
    });
  });

  it("autentica com credenciais corretas e retorna access token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@teste.com", senha: "senha12345" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejeita senha incorreta", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@teste.com", senha: "senhaerrada" });

    expect(res.status).toBe(401);
  });

  it("rejeita usuário inexistente", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "naoexiste@teste.com", senha: "qualquer123" });

    expect(res.status).toBe(401);
  });
});

describe("Rotas protegidas", () => {
  it("rejeita acesso sem token", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
  });

  it("rejeita token inválido", async () => {
    const res = await request(app).get("/api/me").set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
  });

  it("aceita token válido e retorna o usuário autenticado", async () => {
    await request(app).post("/api/auth/signup-empresa").send({
      empresaNome: "Loja Protegida",
      adminNome: "Admin Protegido",
      email: "protegido@teste.com",
      senha: "senha12345",
    });
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "protegido@teste.com", senha: "senha12345" });

    const res = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("protegido@teste.com");
  });
});
