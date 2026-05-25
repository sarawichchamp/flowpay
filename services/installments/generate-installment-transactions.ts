import { addMonths, format, isAfter, parseISO } from "date-fns";
import type { BillingCycle, Installment, Transaction } from "@/types/domain";

export function generateInstallmentTransactions(installment: Installment, cycles: BillingCycle[]) {
  const transactions: Omit<Transaction, "id" | "createdAt">[] = [];
  const startDate = parseISO(installment.startDate);

  for (let index = installment.currentInstallment; index < installment.totalInstallments; index += 1) {
    const date = addMonths(startDate, index);
    if (isAfter(date, parseISO(installment.endDate))) break;

    const cycle = cycles.find(
      (item) => parseISO(item.startDate) <= date && parseISO(item.endDate) >= date
    );

    if (!cycle) continue;

    transactions.push({
      billingCycleId: cycle.id,
      date: format(date, "yyyy-MM-dd"),
      title: `${installment.title} ${index + 1}/${installment.totalInstallments}`,
      categoryId: "installment-category",
      amount: installment.monthlyAmount,
      payerUserId: installment.payerUserId,
      transactionType: "installment",
      splitType: installment.splitType,
      note: "Auto-generated installment payment",
      attachmentUrl: null,
      installmentId: installment.id
    });
  }

  return transactions;
}
