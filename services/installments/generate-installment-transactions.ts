import { addMonths, format, isAfter, parseISO } from "date-fns";
import type { BillingCycle, Installment, Transaction } from "@/types/domain";

export function generateInstallmentTransactions(
  installment: Installment,
  cycles: BillingCycle[],
  categoryId: string
) {
  const transactions: Array<Omit<Transaction, "id" | "createdAt"> & { installmentNumber: number }> = [];
  const startDate = parseISO(installment.startDate);

  for (let installmentNumber = installment.currentInstallment; installmentNumber <= installment.totalInstallments; installmentNumber += 1) {
    const monthOffset = installmentNumber - installment.currentInstallment;
    const date = addMonths(startDate, monthOffset);
    if (isAfter(date, parseISO(installment.endDate))) break;

    const cycle = cycles.find(
      (item) => parseISO(item.startDate) <= date && parseISO(item.endDate) >= date
    );

    if (!cycle) continue;

    transactions.push({
      billingCycleId: cycle.id,
      date: format(date, "yyyy-MM-dd"),
      title: `${installment.title} ${installmentNumber}/${installment.totalInstallments}`,
      categoryId,
      amount: installment.monthlyAmount,
      payerUserId: installment.payerUserId,
      transactionType: "installment",
      splitType: installment.splitType,
      note: "Auto-generated installment payment",
      attachmentUrl: null,
      installmentId: installment.id,
      installmentNumber
    });
  }

  return transactions;
}
