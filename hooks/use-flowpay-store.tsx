"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  categories as seedCategories,
  currentCycle as seedCurrentCycle,
  installments as seedInstallments,
  transactionTypePresets as seedTransactionTypePresets,
  transactions as seedTransactions,
  users as seedUsers
} from "@/data/mock";
import { createClient } from "@/services/supabase/browser";
import type { BillingCycle, Category, Installment, Profile, SplitType, Transaction, TransactionType, TransactionTypePreset, TransactionTypePresetBaseType } from "@/types/domain";
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
  transactionTypePresets: TransactionTypePreset[];
  addTransaction: (input: NewTransactionInput) => Promise<Transaction>;
  addTransactions: (inputs: NewTransactionInput[]) => Promise<Transaction[]>;
  updateTransaction: (id: string, input: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  addInstallment: (input: NewInstallmentInput) => Promise<Installment>;
  updateInstallment: (id: string, input: NewInstallmentInput) => Promise<Installment>;
  deleteInstallment: (id: string) => Promise<void>;
  addTransactionTypePreset: (input: { label: string; baseType: TransactionTypePresetBaseType }) => void;
  updateTransactionTypePreset: (id: string, input: { label: string; baseType: TransactionTypePresetBaseType }) => void;
  deleteTransactionTypePreset: (id: string) => void;
  resetDemoData: () => void;
}

const FlowPayStoreContext = createContext<FlowPayStoreValue | null>(null);
const transactionsStorageKey = "flowpay-demo-transactions";
const installmentsStorageKey = "flowpay-demo-installments";
const transactionTypePresetsStorageKey = "flowpay-transaction-type-presets";

function normalizeTransactionTypePresets(input: unknown): TransactionTypePreset[] {
  if (!Array.isArray(input)) return seedTransactionTypePresets;

  const parsed = input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<TransactionTypePreset>;
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.label !== "string" ||
        (candidate.baseType !== "food" && candidate.baseType !== "normal")
      ) {
        return null;
      }

      return {
        id: candidate.id,
        label: candidate.label.trim(),
        baseType: candidate.baseType
      } satisfies TransactionTypePreset;
    })
    .filter((item): item is TransactionTypePreset => item !== null && item.label.length > 0);

  return parsed.length ? parsed : seedTransactionTypePresets;
}

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

function isBootstrapUsers(users: Profile[]): users is [Profile, Profile] {
  return users.length >= 2;
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
    categories: seedCategories,
    transactionTypePresets: seedTransactionTypePresets
  };
  const [transactions, setTransactions] = useState<Transaction[]>(bootstrap.transactions);
  const [installments, setInstallments] = useState<Installment[]>(bootstrap.installments);
  const [users, setUsers] = useState<[Profile, Profile]>(bootstrap.users);
  const [currentCycle, setCurrentCycle] = useState<BillingCycle>(bootstrap.currentCycle);
  const [categories, setCategories] = useState<Category[]>(bootstrap.categories);
  const [transactionTypePresets, setTransactionTypePresets] = useState<TransactionTypePreset[]>(bootstrap.transactionTypePresets);
  const mode = bootstrap.mode;
  const syncTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== "production") return;

    let cancelled = false;
    const supabase = createClient();

    async function syncFromServer() {
      const response = await fetch("/api/bootstrap", {
        cache: "no-store"
      });
      if (!response.ok || cancelled) return;

      const payload = (await response.json()) as FlowPayBootstrap;
      if (payload.mode !== "production" || cancelled || !isBootstrapUsers(payload.users)) return;

      setUsers([payload.users[0], payload.users[1]]);
      setCurrentCycle(payload.currentCycle);
      setTransactions(payload.transactions);
      setInstallments(payload.installments);
      setCategories(payload.categories);
    }

    function queueSync() {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = window.setTimeout(() => {
        void syncFromServer();
      }, 250);
    }

    const channel = supabase
      .channel("flowpay-household-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, queueSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "installments" }, queueSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "billing_cycles" }, queueSync)
      .subscribe();

    return () => {
      cancelled = true;
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [mode]);

  useEffect(() => {
    const storedTransactionTypePresets = window.localStorage.getItem(transactionTypePresetsStorageKey);
    const storedTransactions = mode === "demo" ? window.localStorage.getItem(transactionsStorageKey) : null;
    const storedInstallments = mode === "demo" ? window.localStorage.getItem(installmentsStorageKey) : null;

    try {
      if (storedTransactionTypePresets) {
        setTransactionTypePresets(normalizeTransactionTypePresets(JSON.parse(storedTransactionTypePresets)));
      }
      if (storedTransactions) setTransactions(JSON.parse(storedTransactions) as Transaction[]);
      if (storedInstallments) setInstallments(JSON.parse(storedInstallments) as Installment[]);
    } catch {
      window.localStorage.removeItem(transactionTypePresetsStorageKey);
      window.localStorage.removeItem(transactionsStorageKey);
      window.localStorage.removeItem(installmentsStorageKey);
    }
  }, []);

  useEffect(() => {
    if (mode !== "demo") return;
    window.localStorage.setItem(transactionsStorageKey, JSON.stringify(transactions));
  }, [mode, transactions]);

  useEffect(() => {
    if (mode !== "demo") return;
    window.localStorage.setItem(installmentsStorageKey, JSON.stringify(installments));
  }, [installments, mode]);

  useEffect(() => {
    window.localStorage.setItem(transactionTypePresetsStorageKey, JSON.stringify(transactionTypePresets));
  }, [transactionTypePresets]);

  const value = useMemo<FlowPayStoreValue>(
    () => ({
      mode,
      users,
      currentCycle,
      categories,
      transactions,
      installments,
      transactionTypePresets,
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

            const result = (await response.json()) as { installment: Installment; currentCycleTransaction: Transaction | null };
            setInstallments((current) => [result.installment, ...current]);
            if (result.currentCycleTransaction) {
              const currentCycleTransaction = result.currentCycleTransaction;
              setTransactions((current) => [currentCycleTransaction, ...current]);
            }
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

            const result = (await response.json()) as { installment: Installment; currentCycleTransaction: Transaction | null };
            setInstallments((current) => current.map((installment) => (installment.id === id ? result.installment : installment)));
            setTransactions((current) => {
              const next = current.filter((transaction) => transaction.installmentId !== id);
              return result.currentCycleTransaction ? [result.currentCycleTransaction, ...next] : next;
            });
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
      addTransactionTypePreset: (input) => {
        const label = input.label.trim();
        if (!label) return;

        setTransactionTypePresets((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            label,
            baseType: input.baseType
          }
        ]);
      },
      updateTransactionTypePreset: (id, input) => {
        const label = input.label.trim();
        if (!label) return;

        setTransactionTypePresets((current) =>
          current.map((preset) =>
            preset.id === id
              ? {
                  ...preset,
                  label,
                  baseType: input.baseType
                }
              : preset
          )
        );
      },
      deleteTransactionTypePreset: (id) => {
        setTransactionTypePresets((current) => {
          const next = current.filter((preset) => preset.id !== id);
          return next.length ? next : seedTransactionTypePresets;
        });
      },
      resetDemoData: () => {
        if (mode !== "demo") return;
        setTransactions(seedTransactions);
        setInstallments(seedInstallments);
      }
    }),
    [categories, currentCycle, installments, mode, transactionTypePresets, transactions, users]
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
