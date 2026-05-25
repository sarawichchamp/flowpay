import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { findCategoryIdByAlias } from "@/repositories/category-helpers";
import { FlowPayRepository } from "@/repositories/flowpay-repository";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { createAdminClient } from "@/services/supabase/admin";

export const dynamic = "force-dynamic";

type BillingCycleRow = {
  start_date?: string | number;
  end_date?: string | number;
  food_budget_target?: number | string;
  food_wallet_holder?: string;
  carry_over_amount?: number | string;
};

type InstallmentRow = {
  title?: string;
  total_installments?: number | string;
  current_installment?: number | string;
  monthly_amount?: number | string;
  start_date?: string | number;
  end_date?: string | number;
  payer?: string;
  split_type?: string;
};

type TransactionRow = {
  date?: string | number;
  title?: string;
  amount?: number | string;
  payer?: string;
  transaction_type?: string;
  split_type?: string;
  category?: string;
  note?: string;
  cycle_start_date?: string | number;
  installment_title?: string;
  installment_number?: number | string;
};

type ValidationIssue = {
  sheet: "BillingCycles" | "Transactions" | "Installments";
  row: number;
  message: string;
};

type InstallmentDuplicateCandidate = {
  title: string;
  totalInstallments: number;
  currentInstallment: number;
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  payerUserId: string;
  splitType: "split_half" | "no_split" | "full_reimburse";
};

type TransactionDuplicateCandidate = {
  cycleId: string;
  date: string;
  title: string;
  categoryId: string;
  amount: number;
  payerUserId: string;
  transactionType: "food" | "normal" | "installment";
  splitType: "split_half" | "no_split" | "full_reimburse";
  note: string | null;
  installmentId: string | null;
};

function toIsoDate(value: number | string | undefined | null) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    const year = String(parsed.y).padStart(4, "0");
    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const text = String(value).trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeText(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

function toNumber(value: number | string | undefined | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveSplitType(value: string | undefined, transactionType: string | undefined) {
  const normalized = normalizeText(value);
  if (normalized === "split_half") return "split_half" as const;
  if (normalized === "full_reimburse") return "full_reimburse" as const;
  if (transactionType === "food") return "no_split" as const;
  return "no_split" as const;
}

function resolveTransactionType(value: string | undefined) {
  const normalized = normalizeText(value);
  if (normalized === "food" || normalized === "ค่าอาหาร") return "food" as const;
  if (normalized === "installment" || normalized === "ผ่อนชำระ") return "installment" as const;
  return "normal" as const;
}

function resolveCategoryAlias(value: string | undefined) {
  const normalized = normalizeText(value);
  if (["food", "อาหาร"].includes(normalized)) return "food";
  if (["transport", "เดินทาง"].includes(normalized)) return "transport";
  if (["shopping", "ช้อปปิ้ง"].includes(normalized)) return "shopping";
  if (["bills", "บิล", "ค่าใช้จ่ายบิล"].includes(normalized)) return "bills";
  if (["entertainment", "บันเทิง"].includes(normalized)) return "entertainment";
  if (["health", "สุขภาพ"].includes(normalized)) return "health";
  if (["investment", "ลงทุน"].includes(normalized)) return "investment";
  if (["other", "อื่นๆ", "อื่น"].includes(normalized)) return "other";
  return "";
}

function resolveUserId(input: string | undefined, users: Array<{ id: string; displayName: string; email?: string | null }>) {
  const normalized = normalizeText(input);
  if (normalized === "a") return users[0]?.id ?? null;
  if (normalized === "b") return users[1]?.id ?? users[0]?.id ?? null;
  return (
    users.find((user) => normalizeText(user.displayName) === normalized || normalizeText(user.email) === normalized)?.id ??
    null
  );
}

function hasAnyValue(row: Record<string, unknown>) {
  return Object.values(row).some((value) => String(value ?? "").trim() !== "");
}

function toAmountKey(value: number) {
  return value.toFixed(2);
}

function buildInstallmentDuplicateKey(input: InstallmentDuplicateCandidate) {
  return [
    normalizeText(input.title),
    input.totalInstallments,
    input.currentInstallment,
    toAmountKey(input.monthlyAmount),
    input.startDate,
    input.endDate,
    input.payerUserId,
    input.splitType
  ].join("|");
}

function buildTransactionDuplicateKey(input: TransactionDuplicateCandidate) {
  return [
    input.cycleId,
    input.date,
    normalizeText(input.title),
    input.categoryId,
    toAmountKey(input.amount),
    input.payerUserId,
    input.transactionType,
    input.splitType,
    normalizeText(input.note),
    input.installmentId ?? ""
  ].join("|");
}

export async function POST(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing Excel file" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const billingRows = (XLSX.utils.sheet_to_json(workbook.Sheets.BillingCycles ?? {}, { defval: "" }) as BillingCycleRow[]) ?? [];
  const installmentRows = (XLSX.utils.sheet_to_json(workbook.Sheets.Installments ?? {}, { defval: "" }) as InstallmentRow[]) ?? [];
  const transactionRows = (XLSX.utils.sheet_to_json(workbook.Sheets.Transactions ?? {}, { defval: "" }) as TransactionRow[]) ?? [];

  const supabase = createAdminClient();
  const repository = new FlowPayRepository(supabase);

  try {
    const users = await repository.getHouseholdProfiles();
    const existingCycles = await repository.getAllBillingCycles();
    const { data: existingInstallments, error: existingInstallmentsError } = await supabase
      .from("installments")
      .select("id,title,total_installments,current_installment,monthly_amount,start_date,end_date,payer_user_id,split_type");
    if (existingInstallmentsError) throw existingInstallmentsError;

    const { data: existingTransactions, error: existingTransactionsError } = await supabase
      .from("transactions")
      .select("id,billing_cycle_id,date,title,category_id,amount,payer_user_id,transaction_type,split_type,note,installment_id");
    if (existingTransactionsError) throw existingTransactionsError;

    const issues: ValidationIssue[] = [];
    const createdCycles = new Map<string, string>();
    const createdInstallments = new Map<string, string>();
    const knownInstallmentTitles = new Set<string>();
    const existingInstallmentKeys = new Set(
      (existingInstallments ?? []).map((installment) =>
        buildInstallmentDuplicateKey({
          title: installment.title,
          totalInstallments: installment.total_installments,
          currentInstallment: installment.current_installment,
          monthlyAmount: Number(installment.monthly_amount),
          startDate: installment.start_date,
          endDate: installment.end_date,
          payerUserId: installment.payer_user_id,
          splitType: installment.split_type
        })
      )
    );
    const existingTransactionKeys = new Set(
      (existingTransactions ?? []).map((transaction) =>
        buildTransactionDuplicateKey({
          cycleId: transaction.billing_cycle_id,
          date: transaction.date,
          title: transaction.title,
          categoryId: transaction.category_id,
          amount: Number(transaction.amount),
          payerUserId: transaction.payer_user_id,
          transactionType: transaction.transaction_type,
          splitType: transaction.split_type,
          note: transaction.note,
          installmentId: transaction.installment_id
        })
      )
    );
    const fileInstallmentKeys = new Set<string>();
    const fileTransactionKeys = new Set<string>();
    let skippedCycles = 0;
    let skippedInstallments = 0;
    let skippedTransactions = 0;

    for (const cycle of existingCycles) {
      createdCycles.set(cycle.startDate, cycle.id);
    }

    for (const installment of existingInstallments ?? []) {
      createdInstallments.set(normalizeText(installment.title), installment.id);
    }

    billingRows.forEach((row, index) => {
      if (!hasAnyValue(row)) return;
      const startDate = toIsoDate(row.start_date);
      const endDate = toIsoDate(row.end_date);
      const budget = toNumber(row.food_budget_target, NaN);
      const walletHolderUserId = resolveUserId(row.food_wallet_holder, users);

      if (!startDate) issues.push({ sheet: "BillingCycles", row: index + 2, message: "start_date is invalid or missing" });
      if (!endDate) issues.push({ sheet: "BillingCycles", row: index + 2, message: "end_date is invalid or missing" });
      if (!Number.isFinite(budget) || budget <= 0) issues.push({ sheet: "BillingCycles", row: index + 2, message: "food_budget_target must be greater than 0" });
      if (!walletHolderUserId) issues.push({ sheet: "BillingCycles", row: index + 2, message: "food_wallet_holder must match A, B, or an existing user name" });
    });

    installmentRows.forEach((row, index) => {
      if (!hasAnyValue(row)) return;
      const startDate = toIsoDate(row.start_date);
      const endDate = toIsoDate(row.end_date);
      const totalInstallments = toNumber(row.total_installments, NaN);
      const currentInstallment = toNumber(row.current_installment, NaN);
      const monthlyAmount = toNumber(row.monthly_amount, NaN);
      const payerUserId = resolveUserId(row.payer, users);
      const title = row.title?.trim() ?? "";

      if (!title) issues.push({ sheet: "Installments", row: index + 2, message: "title is required" });
      if (!startDate) issues.push({ sheet: "Installments", row: index + 2, message: "start_date is invalid or missing" });
      if (!endDate) issues.push({ sheet: "Installments", row: index + 2, message: "end_date is invalid or missing" });
      if (!Number.isFinite(totalInstallments) || totalInstallments <= 0) issues.push({ sheet: "Installments", row: index + 2, message: "total_installments must be greater than 0" });
      if (!Number.isFinite(currentInstallment) || currentInstallment <= 0) issues.push({ sheet: "Installments", row: index + 2, message: "current_installment must be greater than 0" });
      if (Number.isFinite(totalInstallments) && Number.isFinite(currentInstallment) && currentInstallment > totalInstallments) {
        issues.push({ sheet: "Installments", row: index + 2, message: "current_installment must not exceed total_installments" });
      }
      if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) issues.push({ sheet: "Installments", row: index + 2, message: "monthly_amount must be greater than 0" });
      if (!payerUserId) issues.push({ sheet: "Installments", row: index + 2, message: "payer must match A, B, or an existing user name" });
      if (title) knownInstallmentTitles.add(normalizeText(title));
    });

    transactionRows.forEach((row, index) => {
      if (!hasAnyValue(row)) return;
      const date = toIsoDate(row.date);
      const cycleStartDate = toIsoDate(row.cycle_start_date);
      const amount = toNumber(row.amount, NaN);
      const payerUserId = resolveUserId(row.payer, users);
      const title = row.title?.trim() ?? "";
      const transactionType = resolveTransactionType(row.transaction_type);
      const categoryAlias = resolveCategoryAlias(row.category);

      if (!title) issues.push({ sheet: "Transactions", row: index + 2, message: "title is required" });
      if (!date) issues.push({ sheet: "Transactions", row: index + 2, message: "date is invalid or missing" });
      if (!cycleStartDate) issues.push({ sheet: "Transactions", row: index + 2, message: "cycle_start_date is required for historical import" });
      if (!Number.isFinite(amount) || amount <= 0) issues.push({ sheet: "Transactions", row: index + 2, message: "amount must be greater than 0" });
      if (!payerUserId) issues.push({ sheet: "Transactions", row: index + 2, message: "payer must match A, B, or an existing user name" });
      if (!categoryAlias) issues.push({ sheet: "Transactions", row: index + 2, message: "category is invalid or unsupported" });
      if (cycleStartDate && !createdCycles.has(cycleStartDate) && !billingRows.some((billingRow) => toIsoDate(billingRow.start_date) === cycleStartDate)) {
        issues.push({ sheet: "Transactions", row: index + 2, message: "cycle_start_date does not match any BillingCycles row or existing cycle" });
      }
      if (transactionType === "installment") {
        if (!row.installment_title?.trim()) {
          issues.push({ sheet: "Transactions", row: index + 2, message: "installment_title is required when transaction_type is installment" });
        }
        if (toNumber(row.installment_number, NaN) <= 0) {
          issues.push({ sheet: "Transactions", row: index + 2, message: "installment_number must be greater than 0 for installment transactions" });
        }
        if (row.installment_title?.trim() && !knownInstallmentTitles.has(normalizeText(row.installment_title))) {
          issues.push({ sheet: "Transactions", row: index + 2, message: "installment_title does not match any Installments row in the same file" });
        }
      }
    });

    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: `Found ${issues.length} validation issue(s). Fix them before importing.`,
          validationErrors: issues
        },
        { status: 400 }
      );
    }

    for (const row of billingRows) {
      if (!hasAnyValue(row)) continue;
      const startDate = toIsoDate(row.start_date);
      const endDate = toIsoDate(row.end_date);
      const existing = await repository.getBillingCycleByDates(startDate, endDate);

      if (existing) {
        createdCycles.set(startDate, existing.id);
        skippedCycles += 1;
        continue;
      }

      const walletHolderUserId = resolveUserId(row.food_wallet_holder, users);
      const { data, error } = await supabase
        .from("billing_cycles")
        .insert({
          start_date: startDate,
          end_date: endDate,
          food_budget_target: toNumber(row.food_budget_target, 0),
          food_wallet_holder_user_id: walletHolderUserId!,
          carry_over_amount: toNumber(row.carry_over_amount, 0)
        })
        .select("id,start_date")
        .single();

      if (error) throw error;
      createdCycles.set(data.start_date, data.id);
    }

    for (const row of installmentRows) {
      if (!hasAnyValue(row) || !row.title) continue;
      const startDate = toIsoDate(row.start_date);
      const endDate = toIsoDate(row.end_date);
      const payerUserId = resolveUserId(row.payer, users);
      const duplicateKey = buildInstallmentDuplicateKey({
        title: row.title.trim(),
        totalInstallments: toNumber(row.total_installments, 1),
        currentInstallment: toNumber(row.current_installment, 1),
        monthlyAmount: toNumber(row.monthly_amount, 0),
        startDate,
        endDate,
        payerUserId: payerUserId!,
        splitType: resolveSplitType(row.split_type, "installment")
      });

      if (existingInstallmentKeys.has(duplicateKey) || fileInstallmentKeys.has(duplicateKey)) {
        skippedInstallments += 1;
        continue;
      }

      const { data, error } = await supabase
        .from("installments")
        .insert({
          title: row.title.trim(),
          total_installments: toNumber(row.total_installments, 1),
          current_installment: toNumber(row.current_installment, 1),
          monthly_amount: toNumber(row.monthly_amount, 0),
          start_date: startDate,
          end_date: endDate,
          payer_user_id: payerUserId!,
          split_type: resolveSplitType(row.split_type, "installment")
        })
        .select("id,title")
        .single();

      if (error) throw error;
      createdInstallments.set(normalizeText(data.title), data.id);
      existingInstallmentKeys.add(duplicateKey);
      fileInstallmentKeys.add(duplicateKey);
    }

    let importedTransactions = 0;

    for (const row of transactionRows) {
      if (!hasAnyValue(row) || !row.title) continue;
      const transactionDate = toIsoDate(row.date);
      const amount = toNumber(row.amount, 0);
      const payerUserId = resolveUserId(row.payer, users);
      const transactionType = resolveTransactionType(row.transaction_type);
      const splitType = resolveSplitType(row.split_type, transactionType);
      const cycleId = createdCycles.get(toIsoDate(row.cycle_start_date));
      const categoryId = await findCategoryIdByAlias(supabase, resolveCategoryAlias(row.category));
      const installmentId = row.installment_title ? (createdInstallments.get(normalizeText(row.installment_title)) ?? null) : null;
      const duplicateKey = buildTransactionDuplicateKey({
        cycleId: cycleId!,
        date: transactionDate,
        title: row.title.trim(),
        categoryId: categoryId!,
        amount,
        payerUserId: payerUserId!,
        transactionType,
        splitType,
        note: row.note || null,
        installmentId
      });

      if (existingTransactionKeys.has(duplicateKey) || fileTransactionKeys.has(duplicateKey)) {
        skippedTransactions += 1;
        continue;
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          billing_cycle_id: cycleId!,
          date: transactionDate,
          title: row.title.trim(),
          category_id: categoryId!,
          amount,
          payer_user_id: payerUserId!,
          transaction_type: transactionType,
          split_type: splitType,
          note: row.note || null,
          attachment_url: null,
          installment_id: installmentId
        })
        .select("id,installment_id")
        .single();

      if (error) throw error;
      importedTransactions += 1;
      existingTransactionKeys.add(duplicateKey);
      fileTransactionKeys.add(duplicateKey);

      if (transactionType === "installment" && data.installment_id && row.installment_number) {
        const { error: linkError } = await supabase.from("installment_transactions").insert({
          installment_id: data.installment_id,
          transaction_id: data.id,
          installment_number: toNumber(row.installment_number, 1)
        });
        if (linkError) throw linkError;
      }
    }

    return NextResponse.json({
      importedCycles: billingRows.filter((row) => hasAnyValue(row)).length - skippedCycles,
      skippedCycles,
      importedInstallments: installmentRows.filter((row) => hasAnyValue(row)).length - skippedInstallments,
      skippedInstallments,
      importedTransactions,
      skippedTransactions
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import Excel history";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
