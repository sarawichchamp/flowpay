import { categories, currentCycle, installments, transactionTypePresets, transactions, users } from "@/data/mock";
import { FlowPayRepository } from "@/repositories/flowpay-repository";
import { getAppMode } from "@/services/flowpay/app-mode";
import { defaultCarryOverAmount, defaultFoodBudgetTarget, householdPayrollDay } from "@/services/flowpay/config";
import { createAdminClient, isSupabaseAdminConfigured } from "@/services/supabase/admin";
import type { FlowPayBootstrap } from "@/types/flowpay-store";
import { getBillingCycleFromPayrollDate } from "@/utils/billing-cycle";

let householdSetupPromise: Promise<void> | null = null;

async function ensureHouseholdSetup(repository: FlowPayRepository) {
  const supabase = createAdminClient();
  let profiles = await repository.getHouseholdProfiles();
  let activeCycle = await repository.getCurrentBillingCycle();
  const categoryRows = await repository.getCategories();

  if (profiles.length < 2) {
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
        .map((user) => [user.email as string, user])
    );

    for (const [index, seedUser] of users.entries()) {
      let authUser = existingUsersByEmail.get(seedUser.email ?? "");

      if (!authUser) {
        const createdUserResult = await supabase.auth.admin.createUser({
          email: seedUser.email ?? `household${index + 1}@flowpay.local`,
          password: `${crypto.randomUUID()}Aa1!`,
          email_confirm: true,
          user_metadata: {
            display_name: seedUser.displayName
          }
        });

        if (createdUserResult.error || !createdUserResult.data.user) {
          const { data: refreshedUsersResult, error: refreshedUsersError } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 200
          });

          if (refreshedUsersError) {
            throw refreshedUsersError;
          }

          authUser = (refreshedUsersResult.users ?? []).find((user) => user.email === (seedUser.email ?? ""));

          if (!authUser) {
            throw createdUserResult.error ?? new Error("Failed to create household user");
          }
        } else {
          authUser = createdUserResult.data.user;
        }
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: authUser.id,
          display_name: seedUser.displayName,
          email: authUser.email ?? seedUser.email ?? null,
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

  if (!activeCycle && profiles.length >= 2) {
    const derivedCycle = getBillingCycleFromPayrollDate(new Date(), householdPayrollDay);
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
    await runHouseholdSetup(repository);

    const [profiles, cycle, categoryRows, installmentRows] = await Promise.all([
      repository.getHouseholdProfiles(),
      repository.getCurrentBillingCycle(),
      repository.getCategories(),
      repository.getActiveInstallments()
    ]);

    if (!cycle || profiles.length < 2) {
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
    console.error("FlowPay bootstrap fallback to demo mode", error);

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
}
