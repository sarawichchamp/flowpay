import { NextResponse } from "next/server";
import { FlowPayRepository } from "@/repositories/flowpay-repository";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { createAdminClient } from "@/services/supabase/admin";
import { calculateMonthlySettlement } from "@/services/settlement/calculate-monthly-settlement";
import type { SummaryRow } from "@/features/settlement/types";
import { parseInstallmentProgress } from "@/utils/installments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const repository = new FlowPayRepository(supabase);
  const url = new URL(request.url);
  const cycleStart = url.searchParams.get("cycleStart");

  try {
    const [profiles, cycles, installments, categories] = await Promise.all([
      repository.getHouseholdProfiles(),
      repository.getAllBillingCycles(),
      repository.getActiveInstallments(),
      repository.getCategories()
    ]);

    const transactions = await repository.getAllTransactions();

    if (profiles.length < 2) {
      return NextResponse.json({ summaries: [] });
    }

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const filteredCycles = cycleStart ? cycles.filter((cycle) => cycle.startDate === cycleStart) : cycles;
    const summaries: SummaryRow[] = filteredCycles.map((cycle) => {
      const cycleIndex = cycles.findIndex((candidate) => candidate.id === cycle.id);
      const nextCycle = cycleIndex > 0 ? cycles[cycleIndex - 1] : undefined;
      const cycleTransactions = transactions.filter((transaction) => transaction.billingCycleId === cycle.id);
      const transactionMap = new Map(cycleTransactions.map((transaction) => [transaction.id, transaction]));
      const settlement = calculateMonthlySettlement({
        cycle,
        transactions: cycleTransactions,
        userIds: [profiles[0].id, profiles[1].id],
        nextCycleFoodBudgetTarget: nextCycle?.foodBudgetTarget ?? cycle.foodBudgetTarget,
        nextCycleFoodWalletHolderUserId: nextCycle?.foodWalletHolderUserId ?? cycle.foodWalletHolderUserId,
        today: new Date(`${cycle.endDate}T00:00:00.000Z`)
      });

      return {
        cycle,
        transactions: cycleTransactions,
        transactionCount: cycleTransactions.length,
        installmentCount: cycleTransactions.filter((transaction) => transaction.transactionType === "installment").length,
        expenseBreakdown: {
          food: cycleTransactions
            .filter((transaction) => transaction.transactionType === "food")
            .reduce((sum, transaction) => sum + transaction.amount, 0),
          other: cycleTransactions
            .filter((transaction) => transaction.transactionType !== "food")
            .reduce((sum, transaction) => sum + transaction.amount, 0)
        },
        settlement,
        detailedLedger: settlement.ledger.map((line) => {
          const transaction = line.transactionId ? transactionMap.get(line.transactionId) : undefined;
          const category = transaction ? categoryMap.get(transaction.categoryId) : undefined;
          const installmentProgress = transaction ? parseInstallmentProgress(transaction.title) : null;

          return {
            ...line,
            title: transaction?.title ?? line.reason,
            categoryId: transaction?.categoryId ?? null,
            categoryName: category?.name ?? null,
            date: transaction?.date ?? null,
            transactionType: transaction?.transactionType ?? null,
            payerUserId: transaction?.payerUserId ?? null,
            installmentNumber: installmentProgress?.installmentNumber ?? null,
            totalInstallments: installmentProgress?.totalInstallments ?? null
          };
        }),
        installmentTransactions: cycleTransactions
          .filter((transaction) => transaction.transactionType === "installment")
          .map((transaction) => {
            const category = categoryMap.get(transaction.categoryId);
            const installmentProgress = parseInstallmentProgress(transaction.title);

            return {
              fromUserId: transaction.payerUserId,
              toUserId: transaction.payerUserId,
              amount: transaction.amount,
              reason: "Shared installment",
              transactionId: transaction.id,
              title: transaction.title,
              categoryId: transaction.categoryId,
              categoryName: category?.name ?? null,
              date: transaction.date,
              transactionType: transaction.transactionType,
              payerUserId: transaction.payerUserId,
              installmentNumber: installmentProgress?.installmentNumber ?? null,
              totalInstallments: installmentProgress?.totalInstallments ?? null
            };
          })
      };
    });

    return NextResponse.json({
      profiles,
      summaries,
      activeInstallments: installments.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build monthly summary";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
