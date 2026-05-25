import { differenceInCalendarDays, parseISO } from "date-fns";
import type { BillingCycle, LedgerLine, SettlementResult, Transaction } from "@/types/domain";
import { roundMoney } from "@/utils/currency";
import { remainingInclusiveDays } from "@/utils/date";

interface SettlementInput {
  cycle: BillingCycle;
  transactions: Transaction[];
  userIds: [string, string];
  nextCycleFoodBudgetTarget?: number;
  nextCycleFoodWalletHolderUserId?: string;
  today?: Date;
}

function otherUser(userIds: [string, string], userId: string) {
  const other = userIds.find((id) => id !== userId);
  if (!other) throw new Error(`User ${userId} is not part of this two-person household`);
  return other;
}

function addLedgerLine(ledger: LedgerLine[], line: LedgerLine) {
  if (line.amount <= 0) return;
  ledger.push({ ...line, amount: roundMoney(line.amount) });
}

function reduceDirections(ledger: LedgerLine[]) {
  return ledger.reduce<Record<string, number>>((acc, line) => {
    const key = `${line.fromUserId}->${line.toUserId}`;
    acc[key] = roundMoney((acc[key] ?? 0) + line.amount);
    return acc;
  }, {});
}

export function calculateMonthlySettlement({
  cycle,
  transactions,
  userIds,
  nextCycleFoodBudgetTarget = cycle.foodBudgetTarget,
  nextCycleFoodWalletHolderUserId,
  today = new Date()
}: SettlementInput): SettlementResult {
  const ledger: LedgerLine[] = [];
  const holderId = cycle.foodWalletHolderUserId;
  const totalFoodAvailable = cycle.foodBudgetTarget + cycle.carryOverAmount;
  const foodTransactions = transactions.filter((transaction) => transaction.transactionType === "food");
  const foodSpent = foodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const remaining = roundMoney(totalFoodAvailable - foodSpent);
  const exceeded = Math.max(0, roundMoney(foodSpent - totalFoodAvailable));
  const remainingDays = remainingInclusiveDays(cycle.endDate, today);
  const elapsedDays = Math.max(1, differenceInCalendarDays(today, parseISO(cycle.startDate)) + 1);

  for (const transaction of transactions) {
    const payerId = transaction.payerUserId;
    const beneficiaryId = otherUser(userIds, payerId);

    if (transaction.transactionType === "food") {
      if (payerId !== holderId) {
        addLedgerLine(ledger, {
          fromUserId: holderId,
          toUserId: payerId,
          amount: transaction.amount,
          reason: "Food paid by non-holder",
          transactionId: transaction.id
        });
      }
      continue;
    }

    if (transaction.splitType === "split_half") {
      addLedgerLine(ledger, {
        fromUserId: beneficiaryId,
        toUserId: payerId,
        amount: transaction.amount / 2,
        reason: transaction.transactionType === "installment" ? "Shared installment" : "Shared expense",
        transactionId: transaction.id
      });
    }

    if (transaction.splitType === "full_reimburse") {
      addLedgerLine(ledger, {
        fromUserId: beneficiaryId,
        toUserId: payerId,
        amount: transaction.amount,
        reason: "Full reimbursement",
        transactionId: transaction.id
      });
    }
  }

  const availableCarryOver = Math.max(0, remaining);
  const requiredAdditionalContribution = Math.max(0, roundMoney(nextCycleFoodBudgetTarget - availableCarryOver));
  const nextCycleHolderId = nextCycleFoodWalletHolderUserId ?? cycle.foodWalletHolderUserId;

  if (exceeded > 0) {
    const otherParticipantId = otherUser(userIds, holderId);
    addLedgerLine(ledger, {
      fromUserId: otherParticipantId,
      toUserId: holderId,
      amount: exceeded / 2,
      reason: "Food budget overrun"
    });
  }

  if (requiredAdditionalContribution > 0 && userIds.includes(nextCycleHolderId)) {
    const perUserContribution = roundMoney(requiredAdditionalContribution / 2);

    for (const userId of userIds) {
      if (userId === nextCycleHolderId) continue;

      addLedgerLine(ledger, {
        fromUserId: userId,
        toUserId: nextCycleHolderId,
        amount: perUserContribution,
        reason: "Next cycle food contribution"
      });
    }
  }

  const grossByDirection = reduceDirections(ledger);
  const [userA, userB] = userIds;
  const aOwesB = grossByDirection[`${userA}->${userB}`] ?? 0;
  const bOwesA = grossByDirection[`${userB}->${userA}`] ?? 0;
  const net = roundMoney(aOwesB - bOwesA);

  return {
    cycleId: cycle.id,
    food: {
      budgetAvailable: totalFoodAvailable,
      spent: roundMoney(foodSpent),
      remaining,
      exceeded,
      carryOverToNextCycle: availableCarryOver,
      remainingDays,
      averageDailySpending: roundMoney(foodSpent / elapsedDays),
      recommendedMaxDailySpending: remainingDays > 0 ? roundMoney(Math.max(0, remaining) / remainingDays) : 0
    },
    nextCycleContribution: {
      requiredAdditionalContribution,
      perUserContribution: roundMoney(requiredAdditionalContribution / 2)
    },
    ledger,
    grossByDirection,
    finalTransfer:
      net > 0
        ? { fromUserId: userA, toUserId: userB, amount: net }
        : net < 0
          ? { fromUserId: userB, toUserId: userA, amount: Math.abs(net) }
          : null
  };
}
