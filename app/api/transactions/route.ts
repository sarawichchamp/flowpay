import { NextResponse } from "next/server";
import type { z } from "zod";
import { findCategoryIdByAlias } from "@/repositories/category-helpers";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { ensureBillingCycleContainsDate, getHouseholdProfileIds } from "@/services/flowpay/request-validation";
import { dispatchPushNotificationsForTransactions } from "@/services/notifications/dispatch-push";
import { createAdminClient } from "@/services/supabase/admin";
import type { Transaction } from "@/types/domain";
import { deleteByIdSchema, transactionBatchSchema, transactionSchema, transactionUpdateSchema } from "@/utils/validation";

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

type TransactionWriteInput = z.infer<typeof transactionSchema>;

async function validateTransactionReferences(
  supabase: ReturnType<typeof createAdminClient>,
  input: TransactionWriteInput,
  householdProfileIds: Set<string>,
  knownCycleDates: Map<string, boolean>
) {
  if (!householdProfileIds.has(input.payerUserId)) {
    return NextResponse.json({ error: "Invalid payer" }, { status: 400 });
  }

  const cycleDateKey = `${input.billingCycleId}:${input.date}`;
  if (!knownCycleDates.has(cycleDateKey)) {
    knownCycleDates.set(
      cycleDateKey,
      await ensureBillingCycleContainsDate(supabase, input.billingCycleId, input.date)
    );
  }

  if (!knownCycleDates.get(cycleDateKey)) {
    return NextResponse.json({ error: "Transaction date is outside the selected billing cycle" }, { status: 400 });
  }

  const resolvedCategoryId = await findCategoryIdByAlias(supabase, input.categoryId);
  if (!resolvedCategoryId) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (input.transactionType === "food") {
    const foodCategoryId = await findCategoryIdByAlias(supabase, "food");
    if (!foodCategoryId || resolvedCategoryId !== foodCategoryId) {
      return NextResponse.json({ error: "Food transactions must use the food category" }, { status: 400 });
    }

    if (input.splitType !== "no_split") {
      return NextResponse.json({ error: "Food transactions must use no_split" }, { status: 400 });
    }
  }

  return { resolvedCategoryId };
}

export async function POST(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const supabase = createAdminClient();
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = rawBody && typeof rawBody === "object" && "transactions" in rawBody
    ? transactionBatchSchema.safeParse(rawBody)
    : transactionSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transaction payload" }, { status: 400 });
  }

  const inputs = "transactions" in parsed.data ? parsed.data.transactions : [parsed.data];
  const createdTransactions: Transaction[] = [];
  const householdProfileIds = await getHouseholdProfileIds(supabase);
  const knownCycleDates = new Map<string, boolean>();

  for (const input of inputs) {
    const validation = await validateTransactionReferences(supabase, input, householdProfileIds, knownCycleDates);
    if (validation instanceof NextResponse) {
      return validation;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        billing_cycle_id: input.billingCycleId,
        date: input.date,
        title: input.title,
        category_id: validation.resolvedCategoryId,
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

  await dispatchPushNotificationsForTransactions(createdTransactions.map((transaction) => transaction.id));

  if ("transactions" in parsed.data) {
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
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = transactionUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transaction payload" }, { status: 400 });
  }

  const body = parsed.data;

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

  const householdProfileIds = await getHouseholdProfileIds(supabase);
  const validation = await validateTransactionReferences(supabase, body, householdProfileIds, new Map());
  if (validation instanceof NextResponse) {
    return validation;
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({
      billing_cycle_id: body.billingCycleId,
      date: body.date,
      title: body.title,
      category_id: validation.resolvedCategoryId,
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
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = deleteByIdSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transaction id" }, { status: 400 });
  }

  const body = parsed.data;

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
