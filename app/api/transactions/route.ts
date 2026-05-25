import { NextResponse } from "next/server";
import { findCategoryIdByAlias } from "@/repositories/category-helpers";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { createAdminClient } from "@/services/supabase/admin";
import type { Transaction } from "@/types/domain";

function mapTransaction(data: {
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
    id: data.id,
    billingCycleId: data.billing_cycle_id,
    date: data.date,
    title: data.title,
    categoryId: data.category_id,
    amount: data.amount,
    payerUserId: data.payer_user_id,
    transactionType: data.transaction_type,
    splitType: data.split_type,
    note: data.note,
    attachmentUrl: data.attachment_url,
    installmentId: data.installment_id,
    createdAt: data.created_at
  };
}

export async function POST(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const body = (await request.json()) as {
    billingCycleId: string;
    date: string;
    title: string;
    categoryId: string;
    amount: number;
    payerUserId: string;
    transactionType: "food" | "normal" | "installment";
    splitType: "split_half" | "no_split" | "full_reimburse";
    note?: string | null;
    attachmentUrl?: string | null;
    transactions?: Array<{
      billingCycleId: string;
      date: string;
      title: string;
      categoryId: string;
      amount: number;
      payerUserId: string;
      transactionType: "food" | "normal" | "installment";
      splitType: "split_half" | "no_split" | "full_reimburse";
      note?: string | null;
      attachmentUrl?: string | null;
    }>;
  };

  const inputs = body.transactions?.length ? body.transactions : [body];
  const createdTransactions: Transaction[] = [];

  for (const input of inputs) {
    const resolvedCategoryId = await findCategoryIdByAlias(supabase, input.categoryId);

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        billing_cycle_id: input.billingCycleId,
        date: input.date,
        title: input.title,
        category_id: resolvedCategoryId,
        amount: input.amount,
        payer_user_id: input.payerUserId,
        transaction_type: input.transactionType,
        split_type: input.splitType,
        note: input.note ?? null,
        attachment_url: input.attachmentUrl ?? null,
        installment_id: null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    createdTransactions.push(mapTransaction(data));
  }

  if (body.transactions?.length) {
    return NextResponse.json({ transactions: createdTransactions });
  }

  return NextResponse.json({ transaction: createdTransactions[0] });
}

export async function PUT(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const body = (await request.json()) as {
    id: string;
    billingCycleId: string;
    date: string;
    title: string;
    categoryId: string;
    amount: number;
    payerUserId: string;
    transactionType: "food" | "normal" | "installment";
    splitType: "split_half" | "no_split" | "full_reimburse";
    note?: string | null;
    attachmentUrl?: string | null;
  };

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id,installment_id")
    .eq("id", body.id)
    .single();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  if (existing.installment_id) {
    return NextResponse.json({ error: "Installment transactions must be edited from installments" }, { status: 400 });
  }

  const resolvedCategoryId = await findCategoryIdByAlias(supabase, body.categoryId);

  const { data, error } = await supabase
    .from("transactions")
    .update({
      billing_cycle_id: body.billingCycleId,
      date: body.date,
      title: body.title,
      category_id: resolvedCategoryId,
      amount: body.amount,
      payer_user_id: body.payerUserId,
      transaction_type: body.transactionType,
      split_type: body.splitType,
      note: body.note ?? null,
      attachment_url: body.attachmentUrl ?? null
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ transaction: mapTransaction(data) });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  const body = (await request.json()) as { id: string };

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id,installment_id")
    .eq("id", body.id)
    .single();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  if (existing.installment_id) {
    return NextResponse.json({ error: "Installment transactions must be deleted from installments" }, { status: 400 });
  }

  const { error } = await supabase.from("transactions").delete().eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
