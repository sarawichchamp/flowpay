import type { BillingCycle, Category, Installment, Profile, Transaction } from "@/types/domain";
import type { Database } from "@/types/database";

export function mapProfile(row: Database["public"]["Tables"]["profiles"]["Row"]): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    email: row.email
  };
}

export function mapBillingCycle(row: Database["public"]["Tables"]["billing_cycles"]["Row"]): BillingCycle {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    foodBudgetTarget: row.food_budget_target,
    foodWalletHolderUserId: row.food_wallet_holder_user_id,
    carryOverAmount: row.carry_over_amount,
    createdAt: row.created_at
  };
}

export function mapCategory(row: Database["public"]["Tables"]["categories"]["Row"]): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default,
    createdByUserId: row.created_by_user_id
  };
}

export function mapTransaction(row: Database["public"]["Tables"]["transactions"]["Row"]): Transaction {
  return {
    id: row.id,
    billingCycleId: row.billing_cycle_id,
    date: row.date,
    title: row.title,
    categoryId: row.category_id,
    amount: row.amount,
    payerUserId: row.payer_user_id,
    transactionType: row.transaction_type,
    splitType: row.split_type,
    note: row.note,
    attachmentUrl: row.attachment_url,
    installmentId: row.installment_id,
    createdAt: row.created_at
  };
}

export function mapInstallment(row: Database["public"]["Tables"]["installments"]["Row"]): Installment {
  return {
    id: row.id,
    title: row.title,
    totalInstallments: row.total_installments,
    currentInstallment: row.current_installment,
    monthlyAmount: row.monthly_amount,
    startDate: row.start_date,
    endDate: row.end_date,
    payerUserId: row.payer_user_id,
    splitType: row.split_type,
    createdAt: row.created_at
  };
}
