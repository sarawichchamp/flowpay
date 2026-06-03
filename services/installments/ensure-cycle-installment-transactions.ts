import { findCategoryIdByAlias } from "@/repositories/category-helpers";
import { generateInstallmentTransactions } from "@/services/installments/generate-installment-transactions";
import { createAdminClient } from "@/services/supabase/admin";
import type { BillingCycle, Installment } from "@/types/domain";

export async function ensureInstallmentTransactionsForCycle(
  supabase: ReturnType<typeof createAdminClient>,
  billingCycle: BillingCycle,
  installments: Installment[]
) {
  if (!installments.length) return;

  const shoppingCategoryId = await findCategoryIdByAlias(supabase, "shopping");
  if (!shoppingCategoryId) return;

  const { data: existingTransactions, error: existingTransactionsError } = await supabase
    .from("transactions")
    .select("id,installment_id")
    .eq("billing_cycle_id", billingCycle.id)
    .not("installment_id", "is", null);

  if (existingTransactionsError) {
    throw new Error(existingTransactionsError.message);
  }

  const existingInstallmentIds = new Set(existingTransactions.map((row) => row.installment_id).filter((value): value is string => Boolean(value)));
  const scheduledEntries = installments
    .flatMap((installment) => generateInstallmentTransactions(installment, [billingCycle], shoppingCategoryId))
    .filter((transaction) => transaction.billingCycleId === billingCycle.id && transaction.installmentId && !existingInstallmentIds.has(transaction.installmentId));

  if (!scheduledEntries.length) return;

  const { data: insertedTransactions, error: insertTransactionsError } = await supabase
    .from("transactions")
    .insert(
      scheduledEntries.map((transaction) => ({
        billing_cycle_id: transaction.billingCycleId,
        date: transaction.date,
        title: transaction.title,
        category_id: transaction.categoryId,
        amount: transaction.amount,
        payer_user_id: transaction.payerUserId,
        transaction_type: transaction.transactionType,
        split_type: transaction.splitType,
        note: transaction.note ?? null,
        attachment_url: transaction.attachmentUrl ?? null,
        installment_id: transaction.installmentId ?? null
      }))
    )
    .select("id,installment_id");

  if (insertTransactionsError) {
    throw new Error(insertTransactionsError.message);
  }

  const transactionByInstallmentId = new Map(
    insertedTransactions.flatMap((row) => (row.installment_id ? [[row.installment_id, row.id] as const] : []))
  );

  const { error: linkError } = await supabase.from("installment_transactions").insert(
    scheduledEntries.map((transaction) => {
      const transactionId = transaction.installmentId ? transactionByInstallmentId.get(transaction.installmentId) : null;
      if (!transactionId) {
        throw new Error("Failed to link new installment cycle transactions");
      }

      return {
        installment_id: transaction.installmentId!,
        transaction_id: transactionId,
        installment_number: transaction.installmentNumber
      };
    })
  );

  if (linkError) {
    throw new Error(linkError.message);
  }
}
