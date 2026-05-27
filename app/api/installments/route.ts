import { NextResponse } from "next/server";
import { findCategoryIdByAlias } from "@/repositories/category-helpers";
import { FlowPayRepository } from "@/repositories/flowpay-repository";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { generateInstallmentTransactions } from "@/services/installments/generate-installment-transactions";
import { createAdminClient } from "@/services/supabase/admin";
import type { Database } from "@/types/database";
import type { Installment, Transaction } from "@/types/domain";

function mapInstallment(row: Database["public"]["Tables"]["installments"]["Row"]): Installment {
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

function mapTransaction(row: Database["public"]["Tables"]["transactions"]["Row"]): Transaction {
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

type InstallmentRequestBody = {
  id?: string;
  billingCycleId: string;
  title: string;
  totalInstallments: number;
  currentInstallment: number;
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  payerUserId: string;
  splitType: "split_half" | "no_split" | "full_reimburse";
};

async function buildInstallmentSchedule(
  body: InstallmentRequestBody,
  installmentId: string,
  categoryId: string
) {
  const supabase = createAdminClient();
  const repository = new FlowPayRepository(supabase);
  const cycles = await repository.getAllBillingCycles();
  const installment = mapInstallment({
    id: installmentId,
    title: body.title,
    total_installments: body.totalInstallments,
    current_installment: body.currentInstallment,
    monthly_amount: body.monthlyAmount,
    start_date: body.startDate,
    end_date: body.endDate,
    payer_user_id: body.payerUserId,
    split_type: body.splitType,
    created_at: new Date().toISOString()
  });

  return generateInstallmentTransactions(installment, cycles, categoryId);
}

async function syncInstallmentTransactions(
  body: InstallmentRequestBody,
  installmentRow: Database["public"]["Tables"]["installments"]["Row"]
) {
  const supabase = createAdminClient();
  const shoppingCategoryId = await findCategoryIdByAlias(supabase, "shopping");

  if (!shoppingCategoryId) {
    throw new Error("Installment category is missing");
  }

  const scheduledTransactions = await buildInstallmentSchedule(body, installmentRow.id, shoppingCategoryId);

  if (!scheduledTransactions.length) {
    throw new Error("No billing cycles found for the installment schedule");
  }

  const insertPayload = scheduledTransactions.map((transaction) => ({
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
    }));

  const { data: transactionRows, error: transactionError } = await supabase
    .from("transactions")
    .insert(insertPayload)
    .select();

  if (transactionError) {
    throw new Error(transactionError.message);
  }

  const linkPayload = scheduledTransactions.map((scheduled) => {
    const matchingTransaction = transactionRows.find(
      (row) =>
        row.installment_id === installmentRow.id &&
        row.billing_cycle_id === scheduled.billingCycleId &&
        row.date === scheduled.date &&
        row.title === scheduled.title
    );

    if (!matchingTransaction) {
      throw new Error("Failed to link installment transactions");
    }

    return {
      installment_id: installmentRow.id,
      transaction_id: matchingTransaction.id,
      installment_number: scheduled.installmentNumber
    };
  });

  const { error: linkError } = await supabase.from("installment_transactions").insert(linkPayload);

  if (linkError) {
    await supabase.from("transactions").delete().in("id", transactionRows.map((row) => row.id));
    throw new Error(linkError.message);
  }

  return transactionRows;
}

async function deleteLinkedTransactions(installmentId: string) {
  const supabase = createAdminClient();
  const { data: linkRows, error: linkError } = await supabase
    .from("installment_transactions")
    .select("transaction_id")
    .eq("installment_id", installmentId);

  if (linkError) {
    throw new Error(linkError.message);
  }

  const transactionIds = linkRows.map((row) => row.transaction_id);
  if (transactionIds.length) {
    const { error: deleteLinksError } = await supabase.from("installment_transactions").delete().eq("installment_id", installmentId);
    if (deleteLinksError) {
      throw new Error(deleteLinksError.message);
    }

    const { error: deleteTransactionsError } = await supabase.from("transactions").delete().in("id", transactionIds);
    if (deleteTransactionsError) {
      throw new Error(deleteTransactionsError.message);
    }
  }
}

async function loadLinkedTransactionState(installmentId: string) {
  const supabase = createAdminClient();
  const [{ data: transactionRows, error: transactionError }, { data: linkRows, error: linkError }] = await Promise.all([
    supabase.from("transactions").select("*").eq("installment_id", installmentId),
    supabase.from("installment_transactions").select("*").eq("installment_id", installmentId)
  ]);

  if (transactionError) {
    throw new Error(transactionError.message);
  }

  if (linkError) {
    throw new Error(linkError.message);
  }

  return { transactionRows, linkRows };
}

async function restoreLinkedTransactionState(
  installmentId: string,
  transactionRows: Database["public"]["Tables"]["transactions"]["Row"][],
  linkRows: Database["public"]["Tables"]["installment_transactions"]["Row"][]
) {
  if (!transactionRows.length) {
    return;
  }

  const supabase = createAdminClient();
  const { data: restoredTransactions, error: transactionError } = await supabase
    .from("transactions")
    .insert(
      transactionRows.map((row) => ({
        billing_cycle_id: row.billing_cycle_id,
        date: row.date,
        title: row.title,
        category_id: row.category_id,
        amount: row.amount,
        payer_user_id: row.payer_user_id,
        transaction_type: row.transaction_type,
        split_type: row.split_type,
        note: row.note,
        attachment_url: row.attachment_url,
        installment_id: installmentId
      }))
    )
    .select();

  if (transactionError) {
    throw new Error(transactionError.message);
  }

  const restoredByKey = new Map(
    restoredTransactions.map((row) => [`${row.billing_cycle_id}:${row.date}:${row.title}:${row.amount}`, row.id])
  );

  const { error: linkError } = await supabase.from("installment_transactions").insert(
    linkRows.map((row) => {
      const sourceTransaction = transactionRows.find((transaction) => transaction.id === row.transaction_id);
      const restoredTransactionId = sourceTransaction
        ? restoredByKey.get(`${sourceTransaction.billing_cycle_id}:${sourceTransaction.date}:${sourceTransaction.title}:${sourceTransaction.amount}`)
        : null;

      if (!restoredTransactionId) {
        throw new Error("Failed to restore installment links");
      }

      return {
        installment_id: installmentId,
        transaction_id: restoredTransactionId,
        installment_number: row.installment_number
      };
    })
  );

  if (linkError) {
    throw new Error(linkError.message);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const body = (await request.json()) as InstallmentRequestBody;

  const { data: installmentRow, error: installmentError } = await supabase
    .from("installments")
    .insert({
      title: body.title,
      total_installments: body.totalInstallments,
      current_installment: body.currentInstallment,
      monthly_amount: body.monthlyAmount,
      start_date: body.startDate,
      end_date: body.endDate,
      payer_user_id: body.payerUserId,
      split_type: body.splitType
    })
    .select()
    .single();

  if (installmentError) {
    return NextResponse.json({ error: installmentError.message }, { status: 400 });
  }

  try {
    const transactionRows = await syncInstallmentTransactions(body, installmentRow);
    const currentCycleTransaction = transactionRows.find((row) => row.billing_cycle_id === body.billingCycleId) ?? null;

    return NextResponse.json({
      installment: mapInstallment(installmentRow),
      currentCycleTransaction: currentCycleTransaction ? mapTransaction(currentCycleTransaction) : null
    });
  } catch (error) {
    await deleteLinkedTransactions(installmentRow.id).catch(() => undefined);
    await supabase.from("installments").delete().eq("id", installmentRow.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create installment" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const body = (await request.json()) as InstallmentRequestBody;

  const { data: existingInstallment, error: existingInstallmentError } = await supabase
    .from("installments")
    .select("*")
    .eq("id", body.id ?? "")
    .single();

  if (existingInstallmentError) {
    return NextResponse.json({ error: existingInstallmentError.message }, { status: 400 });
  }

  const linkedState = await loadLinkedTransactionState(existingInstallment.id);

  const { data: installmentRow, error: installmentError } = await supabase
    .from("installments")
    .update({
      title: body.title,
      total_installments: body.totalInstallments,
      current_installment: body.currentInstallment,
      monthly_amount: body.monthlyAmount,
      start_date: body.startDate,
      end_date: body.endDate,
      payer_user_id: body.payerUserId,
      split_type: body.splitType
    })
    .eq("id", body.id ?? "")
    .select()
    .single();

  if (installmentError) {
    return NextResponse.json({ error: installmentError.message }, { status: 400 });
  }

  try {
    await deleteLinkedTransactions(installmentRow.id);
    const transactionRows = await syncInstallmentTransactions(body, installmentRow);
    const currentCycleTransaction = transactionRows.find((row) => row.billing_cycle_id === body.billingCycleId) ?? null;

    return NextResponse.json({
      installment: mapInstallment(installmentRow),
      currentCycleTransaction: currentCycleTransaction ? mapTransaction(currentCycleTransaction) : null
    });
  } catch (error) {
    await supabase
      .from("installments")
      .update({
        title: existingInstallment.title,
        total_installments: existingInstallment.total_installments,
        current_installment: existingInstallment.current_installment,
        monthly_amount: existingInstallment.monthly_amount,
        start_date: existingInstallment.start_date,
        end_date: existingInstallment.end_date,
        payer_user_id: existingInstallment.payer_user_id,
        split_type: existingInstallment.split_type
      })
      .eq("id", installmentRow.id);

    await restoreLinkedTransactionState(installmentRow.id, linkedState.transactionRows, linkedState.linkRows).catch(() => undefined);

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update installment" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const body = (await request.json()) as { id: string };

  try {
    await deleteLinkedTransactions(body.id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete installment" }, { status: 400 });
  }

  const { error: deleteInstallmentError } = await supabase.from("installments").delete().eq("id", body.id);
  if (deleteInstallmentError) {
    return NextResponse.json({ error: deleteInstallmentError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
