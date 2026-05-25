import { NextResponse } from "next/server";
import { findCategoryIdByAlias } from "@/repositories/category-helpers";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { createAdminClient } from "@/services/supabase/admin";
import type { Installment, Transaction } from "@/types/domain";

function mapInstallment(row: {
  id: string;
  title: string;
  total_installments: number;
  current_installment: number;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  payer_user_id: string;
  split_type: "split_half" | "no_split" | "full_reimburse";
  created_at: string;
}): Installment {
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

function mapTransaction(row: {
  id: string;
  billing_cycle_id: string;
  date: string;
  title: string;
  category_id: string;
  amount: number;
  payer_user_id: string;
  transaction_type: "food" | "normal" | "installment";
  split_type: "split_half" | "no_split" | "full_reimburse";
  note: string | null;
  attachment_url: string | null;
  installment_id: string | null;
  created_at: string;
}): Transaction {
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

export async function POST(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const shoppingCategoryId = await findCategoryIdByAlias(supabase, "shopping");
  const body = (await request.json()) as {
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

  const { data: transactionRow, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      billing_cycle_id: body.billingCycleId,
      date: body.startDate,
      title: `${body.title} ${body.currentInstallment}/${body.totalInstallments}`,
      category_id: shoppingCategoryId,
      amount: body.monthlyAmount,
      payer_user_id: body.payerUserId,
      transaction_type: "installment",
      split_type: body.splitType,
      note: null,
      attachment_url: null,
      installment_id: installmentRow.id
    })
    .select()
    .single();

  if (transactionError) {
    await supabase.from("installments").delete().eq("id", installmentRow.id);
    return NextResponse.json({ error: transactionError.message }, { status: 400 });
  }

  const { error: linkError } = await supabase.from("installment_transactions").insert({
    installment_id: installmentRow.id,
    transaction_id: transactionRow.id,
    installment_number: installmentRow.current_installment
  });

  if (linkError) {
    await supabase.from("transactions").delete().eq("id", transactionRow.id);
    await supabase.from("installments").delete().eq("id", installmentRow.id);
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  return NextResponse.json({ installment: mapInstallment(installmentRow), transaction: mapTransaction(transactionRow) });
}

export async function PUT(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const shoppingCategoryId = await findCategoryIdByAlias(supabase, "shopping");
  const body = (await request.json()) as {
    id: string;
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
    .eq("id", body.id)
    .select()
    .single();

  if (installmentError) {
    return NextResponse.json({ error: installmentError.message }, { status: 400 });
  }

  const { data: linkRow, error: linkError } = await supabase
    .from("installment_transactions")
    .select("transaction_id")
    .eq("installment_id", body.id)
    .order("installment_number", { ascending: true })
    .limit(1)
    .single();

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  const { data: transactionRow, error: transactionError } = await supabase
    .from("transactions")
    .update({
      billing_cycle_id: body.billingCycleId,
      date: body.startDate,
      title: `${body.title} ${body.currentInstallment}/${body.totalInstallments}`,
      category_id: shoppingCategoryId,
      amount: body.monthlyAmount,
      payer_user_id: body.payerUserId,
      split_type: body.splitType
    })
    .eq("id", linkRow.transaction_id)
    .select()
    .single();

  if (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 400 });
  }

  await supabase
    .from("installment_transactions")
    .update({ installment_number: body.currentInstallment })
    .eq("installment_id", body.id)
    .eq("transaction_id", linkRow.transaction_id);

  return NextResponse.json({ installment: mapInstallment(installmentRow), transaction: mapTransaction(transactionRow) });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const body = (await request.json()) as { id: string };

  const { data: linkRows, error: linkError } = await supabase
    .from("installment_transactions")
    .select("transaction_id")
    .eq("installment_id", body.id);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  const transactionIds = linkRows.map((row) => row.transaction_id);

  if (transactionIds.length > 0) {
    const { error: deleteLinksError } = await supabase.from("installment_transactions").delete().eq("installment_id", body.id);
    if (deleteLinksError) {
      return NextResponse.json({ error: deleteLinksError.message }, { status: 400 });
    }

    const { error: deleteTransactionsError } = await supabase.from("transactions").delete().in("id", transactionIds);
    if (deleteTransactionsError) {
      return NextResponse.json({ error: deleteTransactionsError.message }, { status: 400 });
    }
  }

  const { error: deleteInstallmentError } = await supabase.from("installments").delete().eq("id", body.id);
  if (deleteInstallmentError) {
    return NextResponse.json({ error: deleteInstallmentError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
