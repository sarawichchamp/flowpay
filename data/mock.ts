import type { BillingCycle, Category, Installment, Profile, Transaction } from "@/types/domain";
import { getBillingCycleFromPayrollDate } from "@/utils/billing-cycle";

export const demoToday = new Date("2026-05-24T00:00:00.000Z");
export const householdPayrollDay = 25;
const derivedCycle = getBillingCycleFromPayrollDate(demoToday, householdPayrollDay);

export const users: [Profile, Profile] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    displayName: "A",
    email: "a@flowpay.local"
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    displayName: "B",
    email: "b@flowpay.local"
  }
];

export const currentCycle: BillingCycle = {
  id: "11111111-1111-4111-8111-111111111111",
  startDate: derivedCycle.startDate,
  endDate: derivedCycle.endDate,
  foodBudgetTarget: 10000,
  foodWalletHolderUserId: users[0].id,
  carryOverAmount: 2000,
  createdAt: derivedCycle.createdAt
};

export const categories: Category[] = [
  { id: "food", name: "Food", icon: "Utensils", color: "#14b8a6", isDefault: true },
  { id: "transport", name: "Transport", icon: "Car", color: "#38bdf8", isDefault: true },
  { id: "shopping", name: "Shopping", icon: "ShoppingBag", color: "#f97316", isDefault: true },
  { id: "bills", name: "Bills", icon: "Receipt", color: "#8b5cf6", isDefault: true },
  { id: "entertainment", name: "Entertainment", icon: "Film", color: "#ec4899", isDefault: true },
  { id: "health", name: "Health", icon: "HeartPulse", color: "#ef4444", isDefault: true },
  { id: "investment", name: "Investment", icon: "TrendingUp", color: "#22c55e", isDefault: true },
  { id: "other", name: "Other", icon: "CircleEllipsis", color: "#64748b", isDefault: true }
];

export const transactions: Transaction[] = [
  {
    id: "t1",
    billingCycleId: currentCycle.id,
    date: "2026-05-23",
    title: "KFC dinner",
    categoryId: "food",
    amount: 289,
    payerUserId: users[1].id,
    transactionType: "food",
    splitType: "full_reimburse",
    note: "Paid by non-holder",
    attachmentUrl: null,
    createdAt: "2026-05-23T13:00:00.000Z"
  },
  {
    id: "t2",
    billingCycleId: currentCycle.id,
    date: "2026-05-22",
    title: "Lotus groceries",
    categoryId: "food",
    amount: 1450,
    payerUserId: users[0].id,
    transactionType: "food",
    splitType: "no_split",
    note: null,
    attachmentUrl: null,
    createdAt: "2026-05-22T13:00:00.000Z"
  },
  {
    id: "t3",
    billingCycleId: currentCycle.id,
    date: "2026-05-21",
    title: "Electric bill",
    categoryId: "bills",
    amount: 2200,
    payerUserId: users[0].id,
    transactionType: "normal",
    splitType: "split_half",
    note: null,
    attachmentUrl: null,
    createdAt: "2026-05-21T13:00:00.000Z"
  },
  {
    id: "t4",
    billingCycleId: currentCycle.id,
    date: "2026-05-20",
    title: "iPhone 5/24",
    categoryId: "shopping",
    amount: 1800,
    payerUserId: users[1].id,
    transactionType: "installment",
    splitType: "split_half",
    note: null,
    attachmentUrl: null,
    installmentId: "i1",
    createdAt: "2026-05-20T13:00:00.000Z"
  }
];

export const installments: Installment[] = [
  {
    id: "i1",
    title: "iPhone",
    totalInstallments: 24,
    currentInstallment: 5,
    monthlyAmount: 1800,
    startDate: "2026-01-20",
    endDate: "2027-12-20",
    payerUserId: users[1].id,
    splitType: "split_half",
    createdAt: "2026-01-20T00:00:00.000Z"
  }
];
