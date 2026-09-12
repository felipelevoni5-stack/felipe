-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('SANGRIA', 'SUPRIMENTO');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "cashSessionId" TEXT;

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'ABERTO',
    "openingAmount" DECIMAL(12,2) NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedByUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "countedCash" DECIMAL(12,2),
    "expectedCash" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "totalDinheiro" DECIMAL(12,2),
    "totalPix" DECIMAL(12,2),
    "totalDebito" DECIMAL(12,2),
    "totalCredito" DECIMAL(12,2),
    "totalOutro" DECIMAL(12,2),
    "totalSangrias" DECIMAL(12,2),
    "totalSuprimentos" DECIMAL(12,2),
    "totalCancelado" DECIMAL(12,2),
    "closingJustification" TEXT,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_idx" ON "cash_registers"("tenantId");

-- CreateIndex
CREATE INDEX "cash_registers_storeId_idx" ON "cash_registers"("storeId");

-- CreateIndex
CREATE INDEX "cash_sessions_tenantId_idx" ON "cash_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "cash_sessions_cashRegisterId_status_idx" ON "cash_sessions"("cashRegisterId", "status");

-- CreateIndex
CREATE INDEX "cash_movements_tenantId_idx" ON "cash_movements"("tenantId");

-- CreateIndex
CREATE INDEX "cash_movements_cashSessionId_idx" ON "cash_movements"("cashSessionId");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
