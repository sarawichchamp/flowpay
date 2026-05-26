export type CurrencyCode = "THB";

export type TransactionType = "food" | "normal" | "installment";

export type TransactionTypePresetBaseType = Exclude<TransactionType, "installment">;

export type SplitType = "split_half" | "no_split" | "full_reimburse";

export type Locale = "en" | "th";

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface BillingCycle {
  id: string;
  startDate: string;
  endDate: string;
  foodBudgetTarget: number;
  foodWalletHolderUserId: string;
  carryOverAmount: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  createdByUserId?: string | null;
}

export interface TransactionTypePreset {
  id: string;
  label: string;
  baseType: TransactionTypePresetBaseType;
}

export interface Transaction {
  id: string;
  billingCycleId: string;
  date: string;
  title: string;
  categoryId: string;
  amount: number;
  payerUserId: string;
  transactionType: TransactionType;
  splitType: SplitType;
  note?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
  installmentId?: string | null;
}

export interface Installment {
  id: string;
  title: string;
  totalInstallments: number;
  currentInstallment: number;
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  payerUserId: string;
  splitType: SplitType;
  createdAt: string;
}

export interface Notification {
  id: string;
  actorUserId: string;
  recipientUserId: string;
  transactionId?: string | null;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export interface LedgerLine {
  fromUserId: string;
  toUserId: string;
  amount: number;
  reason: string;
  transactionId?: string;
}

export interface SettlementResult {
  cycleId: string;
  food: {
    budgetAvailable: number;
    spent: number;
    remaining: number;
    exceeded: number;
    carryOverToNextCycle: number;
    remainingDays: number;
    averageDailySpending: number;
    recommendedMaxDailySpending: number;
  };
  nextCycleContribution: {
    requiredAdditionalContribution: number;
    perUserContribution: number;
  };
  ledger: LedgerLine[];
  grossByDirection: Record<string, number>;
  finalTransfer: {
    fromUserId: string;
    toUserId: string;
    amount: number;
  } | null;
}
