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

describe("Controle de permissões (RBAC)", () => {
  it("OPERADOR não consegue criar usuário; ADMIN consegue", async () => {
    await request(app).post("/api/auth/signup-empresa").send({
      empresaNome: "Loja RBAC",
      adminNome: "Admin RBAC",
      email: "admin@rbac.com",
      senha: "senha12345",
    });
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@rbac.com", senha: "senha12345" });
    const adminToken = adminLogin.body.accessToken as string;

    const createOperador = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Operador Um",
        email: "operador@rbac.com",
        senha: "senha12345",
        role: "OPERADOR",
      });
    expect(createOperador.status).toBe(201);

    const operadorLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "operador@rbac.com", senha: "senha12345" });
    const operadorToken = operadorLogin.body.accessToken as string;

    const blocked = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${operadorToken}`)
      .send({
        name: "Outro Usuário",
        email: "outro@rbac.com",
        senha: "senha12345",
        role: "OPERADOR",
      });

    expect(blocked.status).toBe(403);
  });
});
