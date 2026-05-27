import { NextResponse } from "next/server";
import { FlowPayRepository } from "@/repositories/flowpay-repository";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { createAdminClient } from "@/services/supabase/admin";
import { calculateMonthlySettlement } from "@/services/settlement/calculate-monthly-settlement";
import type { SummaryRow } from "@/features/settlement/types";

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
    const [profiles, cycles, transactions, installments, categories] = await Promise.all([
      repository.getHouseholdProfiles(),
      repository.getAllBillingCycles(),
      repository.getAllTransactions(),
      repository.getActiveInstallments(),
      repository.getCategories()
    ]);

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

          return {
            ...line,
            title: transaction?.title ?? line.reason,
            categoryId: transaction?.categoryId ?? null,
            categoryName: category?.name ?? null,
            date: transaction?.date ?? null,
            transactionType: transaction?.transactionType ?? null
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
