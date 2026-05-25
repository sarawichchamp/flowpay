import type { BillingCycle, SettlementResult } from "@/types/domain";

export type DetailedLedgerLine = SettlementResult["ledger"][number] & {
  title: string;
  categoryId?: string | null;
  categoryName?: string | null;
  date?: string | null;
  transactionType?: string | null;
};

export type SummaryRow = {
  cycle: BillingCycle;
  transactionCount: number;
  installmentCount: number;
  settlement: SettlementResult;
  detailedLedger: DetailedLedgerLine[];
};
