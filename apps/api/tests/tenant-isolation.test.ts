import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDatabase } from "./helpers.js";

const app = createApp();

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

describe("Isolamento multi-tenant", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("empresa A não consegue ler usuários da empresa B", async () => {
    const tokenA = await createTenantWithAdmin("Empresa A", "admin@a.com");
    await createTenantWithAdmin("Empresa B", "admin@b.com");

    const resA = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    const emails = resA.body.users.map((u: { email: string }) => u.email);
    expect(emails).toContain("admin@a.com");
    expect(emails).not.toContain("admin@b.com");
  });

  it("empresa A não consegue editar usuário da empresa B manipulando o :id", async () => {
    const tokenA = await createTenantWithAdmin("Empresa A2", "admin@a2.com");
    await createTenantWithAdmin("Empresa B2", "admin@b2.com");

    const userB = await prisma.user.findFirstOrThrow({ where: { email: "admin@b2.com" } });

    const res = await request(app)
      .patch(`/api/users/${userB.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Nome Alterado Indevidamente" });

    expect(res.status).toBe(404);

    const untouched = await prisma.user.findUnique({ where: { id: userB.id } });
    expect(untouched?.name).toBe("Admin");
  });
});
