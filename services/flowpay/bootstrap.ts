import { categories, currentCycle, installments, transactionTypePresets, transactions, users } from "@/data/mock";
import { FlowPayRepository } from "@/repositories/flowpay-repository";
import { getAppMode } from "@/services/flowpay/app-mode";
import { defaultCarryOverAmount, defaultFoodBudgetTarget, householdPayrollDay } from "@/services/flowpay/config";
import { getConfiguredHouseholdMembers } from "@/services/flowpay/household-members";
import { createAdminClient, isSupabaseAdminConfigured } from "@/services/supabase/admin";
import type { FlowPayBootstrap } from "@/types/flowpay-store";
import { getBillingCycleFromPayrollDate } from "@/utils/billing-cycle";
import { getCurrentDateInTimeZone } from "@/utils/date";

let householdSetupPromise: Promise<void> | null = null;

async function ensureHouseholdSetup(repository: FlowPayRepository) {
  const configuredMembers = getConfiguredHouseholdMembers();
  let profiles = await repository.getHouseholdProfiles();
  let activeCycle = await repository.getCurrentBillingCycle();
  const categoryRows = await repository.getCategories();
  const needsProfiles = profiles.length < 2;
  const missingDefaultCategoryNames = categories
    .filter((category) => !categoryRows.some((row) => row.isDefault && row.name === category.name))
    .map((category) => category.name);
  const needsCategories = missingDefaultCategoryNames.length > 0;
  const needsCycle = !activeCycle;

  if (!needsProfiles && !needsCategories && !needsCycle) {
    return;
  }

  const supabase = createAdminClient();

  if (needsProfiles) {
    const { data: authUsersResult, error: authUsersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200
    });

    if (authUsersError) {
      throw authUsersError;
    }

    const existingUsersByEmail = new Map(
      (authUsersResult.users ?? [])
        .filter((user) => Boolean(user.email))
        .map((user) => [(user.email as string).toLowerCase(), user])
    );

    if (configuredMembers) {
      for (const member of configuredMembers) {
        const authUser = existingUsersByEmail.get(member.email);

        if (!authUser) {
          throw new Error(
            `Missing Supabase Auth user for ${member.email}. Create this user manually in Supabase Auth before starting FlowPay production mode.`
          );
        }

        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: authUser.id,
            display_name: member.displayName,
            email: authUser.email ?? member.email,
            avatar_url: null
          },
          {
            onConflict: "id"
          }
        );

        if (profileError) {
          throw profileError;
        }
      }

      profiles = await repository.getHouseholdProfiles();
    } else if (profiles.length < 2) {
      throw new Error(
        "FlowPay household setup is incomplete. Configure FLOWPAY_MEMBER_1_* and FLOWPAY_MEMBER_2_* or create both household profiles first."
      );
    }
  }

  const existingDefaultCategoryNames = new Set(categoryRows.filter((category) => category.isDefault).map((category) => category.name));
  const missingDefaultCategories = categories.filter((category) => !existingDefaultCategoryNames.has(category.name));

  if (missingDefaultCategories.length > 0) {
    const { error: categoriesError } = await supabase.from("categories").insert(
      missingDefaultCategories.map((category) => ({
        name: category.name,
        icon: category.icon,
        color: category.color,
        is_default: true,
        created_by_user_id: null
      }))
    );

    if (categoriesError) {
      throw categoriesError;
    }
  }

  if (needsCycle && profiles.length >= 2) {
    const derivedCycle = getBillingCycleFromPayrollDate(getCurrentDateInTimeZone(), householdPayrollDay);
    const { error: cycleError } = await supabase.from("billing_cycles").insert({
      start_date: derivedCycle.startDate,
      end_date: derivedCycle.endDate,
      food_budget_target: defaultFoodBudgetTarget,
      food_wallet_holder_user_id: profiles[0].id,
      carry_over_amount: defaultCarryOverAmount
    });

    if (cycleError) {
      throw cycleError;
    }

    activeCycle = await repository.getCurrentBillingCycle();
  }
}

async function runHouseholdSetup(repository: FlowPayRepository) {
  if (!householdSetupPromise) {
    householdSetupPromise = ensureHouseholdSetup(repository).finally(() => {
      householdSetupPromise = null;
    });
  }

  await householdSetupPromise;
}

export async function getFlowPayBootstrap(): Promise<FlowPayBootstrap> {
  if (getAppMode() !== "production" || !isSupabaseAdminConfigured()) {
    return {
      mode: "demo",
      users,
      currentCycle,
      transactions,
      installments,
      categories,
      transactionTypePresets
    };
  }

  const supabase = createAdminClient();
  const repository = new FlowPayRepository(supabase);

  try {
    let [profiles, cycle, categoryRows] = await Promise.all([
      repository.getHouseholdProfiles(),
      repository.getCurrentBillingCycle(),
      repository.getCategories()
    ]);

    const hasAllDefaultCategories = categories.every((category) =>
      categoryRows.some((row) => row.isDefault && row.name === category.name)
    );

    if (!cycle || profiles.length < 2 || !hasAllDefaultCategories) {
      await runHouseholdSetup(repository);
      [profiles, cycle, categoryRows] = await Promise.all([
        repository.getHouseholdProfiles(),
        repository.getCurrentBillingCycle(),
        repository.getCategories()
      ]);
    }

    if (!cycle || profiles.length < 2) {
      throw new Error("FlowPay household setup is incomplete. Verify both pre-created household users exist in Supabase Auth.");
    }

    const installmentRows = await repository.getActiveInstallments();
    const cycleTransactions = await repository.getTransactionsForCycle(cycle.id);

    return {
      mode: "production",
      users: [profiles[0], profiles[1]],
      currentCycle: cycle,
      transactions: cycleTransactions,
      installments: installmentRows,
      categories: categoryRows,
      transactionTypePresets
    };
  } catch (error) {
    console.error("FlowPay bootstrap failed", error);

    throw error;
  }
}
