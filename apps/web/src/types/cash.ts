export type CashMovementType = "SANGRIA" | "SUPRIMENTO";

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: string;
  reason: string;
  createdAt: string;
};

export type CashSessionStatus = "ABERTO" | "FECHADO";

export type CashSession = {
  id: string;
  status: CashSessionStatus;
  openingAmount: string;
  openedAt: string;
  openedBy: { id: string; name: string };
  closedAt: string | null;
  closedBy: { id: string; name: string } | null;
  countedCash: string | null;
  expectedCash: string | null;
  difference: string | null;
  totalDinheiro: string | null;
  totalPix: string | null;
  totalDebito: string | null;
  totalCredito: string | null;
  totalOutro: string | null;
  totalSangrias: string | null;
  totalSuprimentos: string | null;
  totalCancelado: string | null;
  closingJustification: string | null;
  cashRegister: { id: string; name: string };
  movements: CashMovement[];
};
