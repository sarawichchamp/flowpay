function normalizeText(value) {
  return (value ?? "").trim().toLowerCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveSplitType(value, transactionType) {
  const normalized = normalizeText(value);
  if (normalized === "split_half") return "split_half";
  if (normalized === "full_reimburse") return "full_reimburse";
  if (transactionType === "food") return "no_split";
  return "no_split";
}

export function resolveTransactionType(value) {
  const normalized = normalizeText(value);
  if (normalized === "food" || normalized === "ค่าอาหาร") return "food";
  if (normalized === "installment" || normalized === "ผ่อนชำระ") return "installment";
  return "normal";
}

export function resolveCategoryAlias(value) {
  const normalized = normalizeText(value);
  if (["food", "อาหาร"].includes(normalized)) return "food";
  if (["transport", "เดินทาง"].includes(normalized)) return "transport";
  if (["shopping", "ช้อปปิ้ง"].includes(normalized)) return "shopping";
  if (["bills", "บิล", "ค่าใช้จ่ายบิล"].includes(normalized)) return "bills";
  if (["entertainment", "บันเทิง"].includes(normalized)) return "entertainment";
  if (["health", "สุขภาพ"].includes(normalized)) return "health";
  if (["investment", "ลงทุน"].includes(normalized)) return "investment";
  if (["other", "อื่นๆ", "อื่น"].includes(normalized)) return "other";
  return "";
}

export function findCategoryIdByAliasSpec(categories, alias) {
  const aliasMap = {
    food: ["Food"],
    transport: ["Transport"],
    shopping: ["Shopping"],
    bills: ["Bills"],
    entertainment: ["Entertainment"],
    health: ["Health"],
    investment: ["Investment"],
    other: ["Other"]
  };

  const candidateNames = aliasMap[alias] ?? aliasMap.other;
  const matchedById = categories.find((category) => category.id === alias);
  if (matchedById) {
    return matchedById.id;
  }

  const matched = categories.find((category) => candidateNames.includes(category.name));
  return matched?.id ?? categories[0]?.id ?? null;
}

export function validateTransactionInputSpec({ input, resolvedCategoryId, foodCategoryId, householdProfileIds, cycleExists }) {
  if (!householdProfileIds.has(input.payerUserId)) {
    return "Invalid payer";
  }

  if (!cycleExists) {
    return "Invalid billing cycle";
  }

  if (!resolvedCategoryId) {
    return "Invalid category";
  }

  if (input.transactionType === "food") {
    if (!foodCategoryId || resolvedCategoryId !== foodCategoryId) {
      return "Food transactions must use the food category";
    }

    if (input.splitType !== "no_split") {
      return "Food transactions must use no_split";
    }
  }

  return null;
}

export function validateImportTransactionRowSpec({ row, knownInstallmentTitles, knownCycleStartDates }) {
  const issues = [];
  const transactionType = resolveTransactionType(row.transaction_type);
  const categoryAlias = resolveCategoryAlias(row.category);
  const splitType = resolveSplitType(row.split_type, transactionType);
  const cycleStartDate = row.cycle_start_date ?? "";

  if (!categoryAlias) {
    issues.push("category is invalid or unsupported");
  }

  if (cycleStartDate && !knownCycleStartDates.has(cycleStartDate)) {
    issues.push("cycle_start_date does not match any BillingCycles row or existing cycle");
  }

  if (transactionType === "food" && categoryAlias && categoryAlias !== "food") {
    issues.push("food transactions must use the food category");
  }

  if (transactionType === "food" && splitType !== "no_split") {
    issues.push("food transactions must use no_split");
  }

  if (transactionType === "installment") {
    if (!row.installment_title?.trim()) {
      issues.push("installment_title is required when transaction_type is installment");
    }
    if (toNumber(row.installment_number, NaN) <= 0) {
      issues.push("installment_number must be greater than 0 for installment transactions");
    }
    if (row.installment_title?.trim() && !knownInstallmentTitles.has(normalizeText(row.installment_title))) {
      issues.push("installment_title does not match any Installments row in the same file");
    }
  }

  return issues;
}

export function createAssertions() {
  return {
    equal(actual, expected, label) {
      if (actual !== expected) {
        throw new Error(`${label}: expected ${expected}, got ${actual}`);
      }
    },
    includes(list, expected, label) {
      if (!list.includes(expected)) {
        throw new Error(`${label}: expected to include ${expected}`);
      }
    },
    ok(value, label) {
      if (!value) {
        throw new Error(`${label}: expected truthy value`);
      }
    },
    notOk(value, label) {
      if (value) {
        throw new Error(`${label}: expected falsy value`);
      }
    }
  };
}

export function validateInstallmentRequestSpec({ payerUserId, householdProfileIds, cycleExists }) {
  if (!householdProfileIds.has(payerUserId)) {
    return "Invalid payer";
  }

  if (!cycleExists) {
    return "Invalid billing cycle";
  }

  return null;
}

export function isMissingRpcFunctionSpec(error) {
  if (!error) return false;

  return error.code === "PGRST202" || error.message?.includes("Could not find the function") || false;
}

const baseTransactionInput = {
  billingCycleId: "cycle-1",
  date: "2026-06-01",
  title: "Food",
  categoryId: "food",
  amount: 100,
  payerUserId: "user-b",
  transactionType: "food",
  splitType: "no_split"
};

export const businessRuleCases = [
  {
    name: "category lookup prefers exact id before alias name",
    run(assert) {
      const categories = [
        { id: "food", name: "Other" },
        { id: "cat-food-1", name: "Food" }
      ];

      assert.equal(findCategoryIdByAliasSpec(categories, "food"), "food", "exact id match");
    }
  },
  {
    name: "food transaction rejects non-food category",
    run(assert) {
      const error = validateTransactionInputSpec({
        input: baseTransactionInput,
        resolvedCategoryId: "cat-other-1",
        foodCategoryId: "cat-food-1",
        householdProfileIds: new Set(["user-a", "user-b"]),
        cycleExists: true
      });

      assert.equal(error, "Food transactions must use the food category", "food category rule");
    }
  },
  {
    name: "food transaction rejects split types other than no_split",
    run(assert) {
      const error = validateTransactionInputSpec({
        input: { ...baseTransactionInput, splitType: "split_half" },
        resolvedCategoryId: "cat-food-1",
        foodCategoryId: "cat-food-1",
        householdProfileIds: new Set(["user-a", "user-b"]),
        cycleExists: true
      });

      assert.equal(error, "Food transactions must use no_split", "food split rule");
    }
  },
  {
    name: "import row rejects food mapped to non-food category",
    run(assert) {
      const issues = validateImportTransactionRowSpec({
        row: {
          transaction_type: "food",
          category: "other",
          split_type: "no_split",
          cycle_start_date: "2026-05-25"
        },
        knownInstallmentTitles: new Set(),
        knownCycleStartDates: new Set(["2026-05-25"])
      });

      assert.includes(issues, "food transactions must use the food category", "import food category rule");
    }
  },
  {
    name: "import row requires installment title and number for installment transactions",
    run(assert) {
      const issues = validateImportTransactionRowSpec({
        row: {
          transaction_type: "installment",
          category: "shopping",
          split_type: "split_half",
          cycle_start_date: "2026-05-25",
          installment_title: "",
          installment_number: ""
        },
        knownInstallmentTitles: new Set(["car"]),
        knownCycleStartDates: new Set(["2026-05-25"])
      });

      assert.includes(issues, "installment_title is required when transaction_type is installment", "installment title rule");
      assert.includes(issues, "installment_number must be greater than 0 for installment transactions", "installment number rule");
    }
  },
  {
    name: "installment request rejects payer outside household",
    run(assert) {
      const error = validateInstallmentRequestSpec({
        payerUserId: "user-x",
        householdProfileIds: new Set(["user-a", "user-b"]),
        cycleExists: true
      });

      assert.equal(error, "Invalid payer", "installment payer rule");
    }
  },
  {
    name: "installment request rejects unknown billing cycle",
    run(assert) {
      const error = validateInstallmentRequestSpec({
        payerUserId: "user-a",
        householdProfileIds: new Set(["user-a", "user-b"]),
        cycleExists: false
      });

      assert.equal(error, "Invalid billing cycle", "installment billing cycle rule");
    }
  },
  {
    name: "rpc helper detects missing function errors",
    run(assert) {
      assert.ok(isMissingRpcFunctionSpec({ code: "PGRST202" }), "rpc missing by code");
      assert.ok(isMissingRpcFunctionSpec({ message: "Could not find the function public.test()" }), "rpc missing by message");
      assert.notOk(isMissingRpcFunctionSpec({ code: "23505", message: "duplicate key value" }), "rpc duplicate is not missing");
      assert.notOk(isMissingRpcFunctionSpec(null), "null rpc error is not missing");
    }
  }
];
