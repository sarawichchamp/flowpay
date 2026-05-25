import type { BillingCycle, Category, Installment, Profile, Transaction } from "@/types/domain";

export interface FlowPayBootstrap {
  mode: "demo" | "production";
  users: [Profile, Profile];
  currentCycle: BillingCycle;
  transactions: Transaction[];
  installments: Installment[];
  categories: Category[];
}
