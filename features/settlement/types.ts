import type { BillingCycle, SettlementResult } from "@/types/domain";

export type DetailedLedgerLine = SettlementResult["ledger"][number] & {
  title: string;
  categoryId?: string | null;
  categoryName?: string | null;
  date?: string | null;
  transactionType?: string | null;
  payerUserId?: string | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
};

export type SummaryRow = {
  cycle: BillingCycle;
  transactionCount: number;
  installmentCount: number;
  expenseBreakdown: {
    food: number;
    other: number;
  };
  settlement: SettlementResult;
  detailedLedger: DetailedLedgerLine[];
  installmentTransactions: DetailedLedgerLine[];
};
