import { prisma } from "../src/lib/prisma.js";

// Limpa as tabelas usadas nos testes, na ordem correta de dependências.
export async function resetDatabase() {
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashSession.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.tenant.deleteMany();
}
