function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function otherUser(userIds, userId) {
  const other = userIds.find((id) => id !== userId);
  if (!other) {
    throw new Error(`User ${userId} is not part of this two-person household`);
  }

  return other;
}

function addLedgerLine(ledger, line) {
  if (line.amount <= 0) return;
  ledger.push({ ...line, amount: roundMoney(line.amount) });
}

function reduceDirections(ledger) {
  return ledger.reduce((acc, line) => {
    const key = `${line.fromUserId}->${line.toUserId}`;
    acc[key] = roundMoney((acc[key] ?? 0) + line.amount);
    return acc;
  }, {});
}

export function calculateSettlementSpec({
  cycle,
  transactions,
  userIds,
  nextCycleFoodBudgetTarget = cycle.foodBudgetTarget,
  nextCycleFoodWalletHolderUserId = cycle.foodWalletHolderUserId
}) {
  const ledger = [];
  const holderId = cycle.foodWalletHolderUserId;
  const totalFoodAvailable = cycle.foodBudgetTarget + cycle.carryOverAmount;
  const foodTransactions = transactions.filter((transaction) => transaction.transactionType === "food");
  const foodSpent = foodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const remaining = roundMoney(totalFoodAvailable - foodSpent);
  const exceeded = Math.max(0, roundMoney(foodSpent - totalFoodAvailable));

  for (const transaction of transactions) {
    const payerId = transaction.payerUserId;
    const beneficiaryId = otherUser(userIds, payerId);

    if (transaction.transactionType === "food") {
      if (payerId !== holderId) {
        addLedgerLine(ledger, {
          fromUserId: holderId,
          toUserId: payerId,
          amount: transaction.amount,
          reason: "Food paid by non-holder"
        });
      }
      continue;
    }

    if (transaction.splitType === "split_half") {
      addLedgerLine(ledger, {
        fromUserId: beneficiaryId,
        toUserId: payerId,
        amount: transaction.amount / 2,
        reason: transaction.transactionType === "installment" ? "Shared installment" : "Shared expense"
      });
    }

    if (transaction.splitType === "full_reimburse") {
      addLedgerLine(ledger, {
        fromUserId: beneficiaryId,
        toUserId: payerId,
        amount: transaction.amount,
        reason: "Full reimbursement"
      });
    }
  }

  const availableCarryOver = Math.max(0, remaining);
  const requiredAdditionalContribution = Math.max(0, roundMoney(nextCycleFoodBudgetTarget - availableCarryOver));

  if (exceeded > 0) {
    addLedgerLine(ledger, {
      fromUserId: otherUser(userIds, holderId),
      toUserId: holderId,
      amount: exceeded / 2,
      reason: "Food budget overrun"
    });
  }

  if (requiredAdditionalContribution > 0 && userIds.includes(nextCycleFoodWalletHolderUserId)) {
    const perUserContribution = roundMoney(requiredAdditionalContribution / 2);

    for (const userId of userIds) {
      if (userId === nextCycleFoodWalletHolderUserId) continue;

      addLedgerLine(ledger, {
        fromUserId: userId,
        toUserId: nextCycleFoodWalletHolderUserId,
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
    food: {
      remaining,
      exceeded,
      carryOverToNextCycle: availableCarryOver
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

export const USER_A = "champ";
export const USER_B = "lily";
export const USER_IDS = [USER_A, USER_B];

export function createCycle(overrides = {}) {
  return {
    id: "cycle-1",
    startDate: "2026-05-25",
    endDate: "2026-06-24",
    foodBudgetTarget: 10000,
    foodWalletHolderUserId: USER_A,
    carryOverAmount: 0,
    createdAt: "2026-05-24T00:00:00.000Z",
    ...overrides
  };
}

export function createTransaction(overrides = {}) {
  return {
    id: "tx-1",
    billingCycleId: "cycle-1",
    date: "2026-06-01",
    title: "Transaction",
    categoryId: "category-1",
    amount: 0,
    payerUserId: USER_A,
    transactionType: "normal",
    splitType: "no_split",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides
  };
}

export const settlementRuleCases = [
  {
    name: "food paid by non-holder is reimbursed in full",
    run(assert) {
      const result = calculateSettlementSpec({
        cycle: createCycle(),
        transactions: [
          createTransaction({
            id: "food-1",
            amount: 120,
            payerUserId: USER_B,
            transactionType: "food"
          })
        ],
        userIds: USER_IDS,
        nextCycleFoodBudgetTarget: 10000
      });

      assert.lineIncludes(result.ledger, {
        fromUserId: USER_A,
        toUserId: USER_B,
        amount: 120,
        reason: "Food paid by non-holder"
      });
    }
  },
  {
    name: "food carry-over is moved as one whole amount",
    run(assert) {
      const result = calculateSettlementSpec({
        cycle: createCycle({ foodBudgetTarget: 10000 }),
        transactions: [
          createTransaction({
            id: "food-2",
            amount: 4000,
            payerUserId: USER_A,
            transactionType: "food"
          })
        ],
        userIds: USER_IDS,
        nextCycleFoodBudgetTarget: 10000
      });

      assert.equal(result.food.carryOverToNextCycle, 6000, "carry-over amount");
      assert.equal(result.nextCycleContribution.requiredAdditionalContribution, 4000, "required refill");
      assert.equal(result.nextCycleContribution.perUserContribution, 2000, "per-user refill");
    }
  },
  {
    name: "food overrun is split in half",
    run(assert) {
      const result = calculateSettlementSpec({
        cycle: createCycle({ foodBudgetTarget: 10000 }),
        transactions: [
          createTransaction({
            id: "food-3",
            amount: 13266,
            payerUserId: USER_A,
            transactionType: "food"
          })
        ],
        userIds: USER_IDS,
        nextCycleFoodBudgetTarget: 10000
      });

      assert.equal(result.food.exceeded, 3266, "food overrun");
      assert.lineIncludes(result.ledger, {
        fromUserId: USER_B,
        toUserId: USER_A,
        amount: 1633,
        reason: "Food budget overrun"
      });
    }
  },
  {
    name: "next-cycle refill asks the non-holder for only half",
    run(assert) {
      const result = calculateSettlementSpec({
        cycle: createCycle({ foodBudgetTarget: 10000 }),
        transactions: [
          createTransaction({
            id: "food-4",
            amount: 10000,
            payerUserId: USER_A,
            transactionType: "food"
          })
        ],
        userIds: USER_IDS,
        nextCycleFoodBudgetTarget: 10000
      });

      assert.equal(result.nextCycleContribution.requiredAdditionalContribution, 10000, "required refill");
      assert.equal(result.nextCycleContribution.perUserContribution, 5000, "per-user refill");
      assert.lineIncludes(result.ledger, {
        fromUserId: USER_B,
        toUserId: USER_A,
        amount: 5000,
        reason: "Next cycle food contribution"
      });
    }
  },
  {
    name: "shared installment remains split by half",
    run(assert) {
      const result = calculateSettlementSpec({
        cycle: createCycle(),
        transactions: [
          createTransaction({
            id: "installment-1",
            title: "Car 8/60",
            amount: 6860,
            payerUserId: USER_A,
            transactionType: "installment",
            splitType: "split_half"
          })
        ],
        userIds: USER_IDS,
        nextCycleFoodBudgetTarget: 10000
      });

      assert.lineIncludes(result.ledger, {
        fromUserId: USER_B,
        toUserId: USER_A,
        amount: 3430,
        reason: "Shared installment"
      });
    }
  }
];

export function createAssertions() {
  return {
    equal(actual, expected, label) {
      if (actual !== expected) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
      }
    },
    lineIncludes(lines, expectedLine) {
      const found = lines.some((line) =>
        Object.entries(expectedLine).every(([key, value]) => line[key] === value)
      );

      if (!found) {
        throw new Error(`expected line ${JSON.stringify(expectedLine)}`);
      }
    }
  };
}
