"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { categories as seedCategories, currentCycle as seedCurrentCycle, installments as seedInstallments, transactions as seedTransactions, users as seedUsers } from "@/data/mock";
import type { BillingCycle, Category, Installment, Profile, SplitType, Transaction, TransactionType } from "@/types/domain";
import type { FlowPayBootstrap } from "@/types/flowpay-store";

interface NewTransactionInput {
  billingCycleId?: string;
  title: string;
  date: string;
  amount: number;
  payerUserId: string;
  transactionType: TransactionType;
  splitType: SplitType;
  categoryId?: string;
  note?: string | null;
  attachmentUrl?: string | null;
}

interface NewInstallmentInput {
  title: string;
  totalInstallments: number;
  currentInstallment: number;
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  payerUserId: string;
  splitType: SplitType;
}

interface FlowPayStoreValue {
  mode: "demo" | "production";
  users: [Profile, Profile];
  currentCycle: BillingCycle;
  categories: Category[];
  transactions: Transaction[];
  installments: Installment[];
  addTransaction: (input: NewTransactionInput) => Promise<Transaction>;
  addTransactions: (inputs: NewTransactionInput[]) => Promise<Transaction[]>;
  updateTransaction: (id: string, input: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  addInstallment: (input: NewInstallmentInput) => Promise<Installment>;
  updateInstallment: (id: string, input: NewInstallmentInput) => Promise<Installment>;
  deleteInstallment: (id: string) => Promise<void>;
  resetDemoData: () => void;
}

const FlowPayStoreContext = createContext<FlowPayStoreValue | null>(null);
const transactionsStorageKey = "flowpay-demo-transactions";
const installmentsStorageKey = "flowpay-demo-installments";

function createTransaction(input: NewTransactionInput): Transaction {
  return {
    id: crypto.randomUUID(),
    billingCycleId: input.billingCycleId ?? seedCurrentCycle.id,
    date: input.date,
    title: input.title.trim(),
    categoryId: input.categoryId ?? "other",
    amount: input.amount,
    payerUserId: input.payerUserId,
    transactionType: input.transactionType,
    splitType: input.splitType,
    note: input.note ?? null,
    attachmentUrl: input.attachmentUrl ?? null,
    createdAt: new Date().toISOString()
  };
}

function createInstallment(input: NewInstallmentInput): Installment {
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    totalInstallments: input.totalInstallments,
    currentInstallment: input.currentInstallment,
    monthlyAmount: input.monthlyAmount,
    startDate: input.startDate,
    endDate: input.endDate,
    payerUserId: input.payerUserId,
    splitType: input.splitType,
    createdAt: new Date().toISOString()
  };
}

export function FlowPayStoreProvider({
  children,
  initialData
}: {
  children: ReactNode;
  initialData?: FlowPayBootstrap;
}) {
  const bootstrap = initialData ?? {
    mode: "demo" as const,
    users: seedUsers,
    currentCycle: seedCurrentCycle,
    transactions: seedTransactions,
    installments: seedInstallments,
    categories: seedCategories
  };
  const [transactions, setTransactions] = useState<Transaction[]>(bootstrap.transactions);
  const [installments, setInstallments] = useState<Installment[]>(bootstrap.installments);
  const [users] = useState<[Profile, Profile]>(bootstrap.users);
  const [currentCycle] = useState<BillingCycle>(bootstrap.currentCycle);
  const [categories] = useState<Category[]>(bootstrap.categories);
  const mode = bootstrap.mode;

  useEffect(() => {
    if (mode !== "demo") return;
    const storedTransactions = window.localStorage.getItem(transactionsStorageKey);
    const storedInstallments = window.localStorage.getItem(installmentsStorageKey);

    try {
      if (storedTransactions) setTransactions(JSON.parse(storedTransactions) as Transaction[]);
      if (storedInstallments) setInstallments(JSON.parse(storedInstallments) as Installment[]);
    } catch {
      window.localStorage.removeItem(transactionsStorageKey);
      window.localStorage.removeItem(installmentsStorageKey);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "demo") return;
    window.localStorage.setItem(transactionsStorageKey, JSON.stringify(transactions));
  }, [mode, transactions]);

  useEffect(() => {
    if (mode !== "demo") return;
    window.localStorage.setItem(installmentsStorageKey, JSON.stringify(installments));
  }, [installments, mode]);

  const value = useMemo<FlowPayStoreValue>(
    () => ({
      mode,
      users,
      currentCycle,
      categories,
      transactions,
      installments,
      addTransaction: async (input) => {
        if (mode === "production") {
          const response = await fetch("/api/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              billingCycleId: input.billingCycleId ?? currentCycle.id,
              date: input.date,
              title: input.title,
              categoryId: input.categoryId ?? "other",
              amount: input.amount,
              payerUserId: input.payerUserId,
              transactionType: input.transactionType,
              splitType: input.splitType,
              note: input.note ?? null,
              attachmentUrl: input.attachmentUrl ?? null
            })
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Failed to create transaction");
          }

          const result = (await response.json()) as { transaction: Transaction };
          setTransactions((current) => [result.transaction, ...current]);
          return result.transaction;
        }

        const transaction = createTransaction({
          ...input,
          billingCycleId: input.billingCycleId ?? currentCycle.id
        });
        setTransactions((current) => [transaction, ...current]);
        return transaction;
      },
      addTransactions: async (inputs) => {
        if (mode === "production") {
          const response = await fetch("/api/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              transactions: inputs.map((input) => ({
                billingCycleId: input.billingCycleId ?? currentCycle.id,
                date: input.date,
                title: input.title,
                categoryId: input.categoryId ?? "other",
                amount: input.amount,
                payerUserId: input.payerUserId,
                transactionType: input.transactionType,
                splitType: input.splitType,
                note: input.note ?? null,
                attachmentUrl: input.attachmentUrl ?? null
              }))
            })
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Failed to create transactions");
          }

          const result = (await response.json()) as { transactions: Transaction[] };
          setTransactions((current) => [...result.transactions, ...current]);
          return result.transactions;
        }

        const createdTransactions = inputs.map((input) =>
          createTransaction({
            ...input,
            billingCycleId: input.billingCycleId ?? currentCycle.id
          })
        );
        setTransactions((current) => [...createdTransactions, ...current]);
        return createdTransactions;
      },
      updateTransaction: async (id, input) => {
        if (mode === "production") {
          const response = await fetch("/api/transactions", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id,
              billingCycleId: input.billingCycleId ?? currentCycle.id,
              date: input.date,
              title: input.title,
              categoryId: input.categoryId ?? "other",
              amount: input.amount,
              payerUserId: input.payerUserId,
              transactionType: input.transactionType,
              splitType: input.splitType,
              note: input.note ?? null,
              attachmentUrl: input.attachmentUrl ?? null
            })
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Failed to update transaction");
          }

          const result = (await response.json()) as { transaction: Transaction };
          setTransactions((current) => current.map((transaction) => (transaction.id === id ? result.transaction : transaction)));
          return result.transaction;
        }

        const transaction = {
          ...createTransaction({
            ...input,
            billingCycleId: input.billingCycleId ?? currentCycle.id
          }),
          id
        };
        setTransactions((current) => current.map((item) => (item.id === id ? transaction : item)));
        return transaction;
      },
      deleteTransaction: async (id) => {
        if (mode === "production") {
          const response = await fetch("/api/transactions", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ id })
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Failed to delete transaction");
          }
        }

        setTransactions((current) => current.filter((transaction) => transaction.id !== id));
      },
      addInstallment: async (input) => {
        if (mode === "production") {
          const response = await fetch("/api/installments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ...input,
              billingCycleId: currentCycle.id
            })
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Failed to create installment");
          }

          const result = (await response.json()) as { installment: Installment; transaction: Transaction };
          setInstallments((current) => [result.installment, ...current]);
          setTransactions((current) => [result.transaction, ...current]);
          return result.installment;
        }

        const installment = createInstallment(input);
        const transaction = createTransaction({
          billingCycleId: currentCycle.id,
          title: `${installment.title} ${installment.currentInstallment}/${installment.totalInstallments}`,
          date: installment.startDate,
          amount: installment.monthlyAmount,
          payerUserId: installment.payerUserId,
          transactionType: "installment",
          splitType: installment.splitType,
          categoryId: "shopping"
        });
        transaction.installmentId = installment.id;
        setInstallments((current) => [installment, ...current]);
        setTransactions((current) => [transaction, ...current]);
        return installment;
      },
      updateInstallment: async (id, input) => {
        if (mode === "production") {
          const response = await fetch("/api/installments", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id,
              billingCycleId: currentCycle.id,
              ...input
            })
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Failed to update installment");
          }

          const result = (await response.json()) as { installment: Installment; transaction: Transaction };
          setInstallments((current) => current.map((installment) => (installment.id === id ? result.installment : installment)));
          setTransactions((current) => current.map((transaction) => (transaction.installmentId === id ? result.transaction : transaction)));
          return result.installment;
        }

        const installment = {
          ...createInstallment(input),
          id
        };
        const transaction = createTransaction({
          billingCycleId: currentCycle.id,
          title: `${installment.title} ${installment.currentInstallment}/${installment.totalInstallments}`,
          date: installment.startDate,
          amount: installment.monthlyAmount,
          payerUserId: installment.payerUserId,
          transactionType: "installment",
          splitType: installment.splitType,
          categoryId: "shopping"
        });
        transaction.id = transactions.find((item) => item.installmentId === id)?.id ?? transaction.id;
        transaction.installmentId = id;
        setInstallments((current) => current.map((item) => (item.id === id ? installment : item)));
        setTransactions((current) => current.map((item) => (item.installmentId === id ? transaction : item)));
        return installment;
      },
      deleteInstallment: async (id) => {
        if (mode === "production") {
          const response = await fetch("/api/installments", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ id })
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Failed to delete installment");
          }
        }

        setInstallments((current) => current.filter((installment) => installment.id !== id));
        setTransactions((current) => current.filter((transaction) => transaction.installmentId !== id));
      },
      resetDemoData: () => {
        if (mode !== "demo") return;
        setTransactions(seedTransactions);
        setInstallments(seedInstallments);
      }
    }),
    [categories, currentCycle, installments, mode, transactions, users]
  );

  return <FlowPayStoreContext.Provider value={value}>{children}</FlowPayStoreContext.Provider>;
}

export function useFlowPayStore() {
  const context = useContext(FlowPayStoreContext);
  if (!context) {
    throw new Error("useFlowPayStore must be used inside FlowPayStoreProvider");
  }
  return context;
}
