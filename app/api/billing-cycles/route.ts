import { addDays, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import { FlowPayRepository } from "@/repositories/flowpay-repository";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { defaultFoodBudgetTarget, householdPayrollDay } from "@/services/flowpay/config";
import { ensureInstallmentTransactionsForCycle } from "@/services/installments/ensure-cycle-installment-transactions";
import { calculateMonthlySettlement } from "@/services/settlement/calculate-monthly-settlement";
import { createAdminClient } from "@/services/supabase/admin";
import { getBillingCycleFromPayrollDate } from "@/utils/billing-cycle";
import type { BillingCycle } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const repository = new FlowPayRepository(supabase);

  try {
    const [currentCycle, upcomingCycle] = await Promise.all([
      repository.getCurrentBillingCycle(),
      repository.getUpcomingBillingCycle()
    ]);

    return NextResponse.json({ currentCycle, upcomingCycle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load billing cycles";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const repository = new FlowPayRepository(supabase);

  try {
    const body = (await request.json()) as {
      foodBudgetTarget?: number;
      foodWalletHolderUserId?: string;
    };

    const [currentCycle, profiles, installments] = await Promise.all([
      repository.getCurrentBillingCycle(),
      repository.getHouseholdProfiles(),
      repository.getActiveInstallments()
    ]);

    if (!currentCycle || profiles.length < 2) {
      return NextResponse.json({ error: "Current cycle is unavailable" }, { status: 400 });
    }

    const nextHolderUserId = body.foodWalletHolderUserId ?? currentCycle.foodWalletHolderUserId;
    const nextBudgetTarget = body.foodBudgetTarget ?? defaultFoodBudgetTarget;

    if (!profiles.some((profile) => profile.id === nextHolderUserId)) {
      return NextResponse.json({ error: "Invalid wallet holder" }, { status: 400 });
    }

    const cycleTransactions = await repository.getTransactionsForCycle(currentCycle.id);
    const settlement = calculateMonthlySettlement({
      cycle: currentCycle,
      transactions: cycleTransactions,
      userIds: [profiles[0].id, profiles[1].id],
      nextCycleFoodBudgetTarget: nextBudgetTarget,
      today: parseISO(currentCycle.endDate)
    });

    const nextCycleReferenceDate = addDays(parseISO(currentCycle.endDate), 1);
    const derivedCycle = getBillingCycleFromPayrollDate(nextCycleReferenceDate, householdPayrollDay);
    const existingCycle = await repository.getBillingCycleByDates(derivedCycle.startDate, derivedCycle.endDate);

    if (existingCycle) {
      await ensureInstallmentTransactionsForCycle(supabase, existingCycle, installments);
      return NextResponse.json({
        billingCycle: existingCycle,
        carryOverAmount: settlement.food.carryOverToNextCycle,
        alreadyExists: true
      });
    }

    const { data, error } = await supabase
      .from("billing_cycles")
      .insert({
        start_date: derivedCycle.startDate,
        end_date: derivedCycle.endDate,
        food_budget_target: nextBudgetTarget,
        food_wallet_holder_user_id: nextHolderUserId,
        carry_over_amount: settlement.food.carryOverToNextCycle
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const createdCycle: BillingCycle = {
      id: data.id,
      startDate: data.start_date,
      endDate: data.end_date,
      foodBudgetTarget: data.food_budget_target,
      foodWalletHolderUserId: data.food_wallet_holder_user_id,
      carryOverAmount: data.carry_over_amount,
      createdAt: data.created_at
    };

    await ensureInstallmentTransactionsForCycle(supabase, createdCycle, installments);

    return NextResponse.json({
      billingCycle: createdCycle,
      carryOverAmount: settlement.food.carryOverToNextCycle,
      alreadyExists: false
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create next billing cycle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();

  try {
    const body = (await request.json()) as {
      id: string;
      foodBudgetTarget?: number;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Billing cycle id is required" }, { status: 400 });
    }

    const nextBudgetTarget = body.foodBudgetTarget ?? defaultFoodBudgetTarget;

    const { data, error } = await supabase
      .from("billing_cycles")
      .update({
        food_budget_target: nextBudgetTarget
      })
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      billingCycle: {
        id: data.id,
        startDate: data.start_date,
        endDate: data.end_date,
        foodBudgetTarget: data.food_budget_target,
        foodWalletHolderUserId: data.food_wallet_holder_user_id,
        carryOverAmount: data.carry_over_amount,
        createdAt: data.created_at
      },
      updated: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update next billing cycle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
