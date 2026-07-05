"use client";

import { FormEvent, useState } from "react";
import { Pencil, Repeat, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n/dictionary";
import type { SplitType } from "@/types/domain";
import { formatTHB } from "@/utils/currency";
import { parseInstallmentProgress } from "@/utils/installments";

const splitTypeOptions: Array<{ value: SplitType; labelKey: "splitHalf" | "noSplit" | "fullReimburse" }> = [
  { value: "split_half", labelKey: "splitHalf" },
  { value: "no_split", labelKey: "noSplit" },
  { value: "full_reimburse", labelKey: "fullReimburse" }
];

function installmentsCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        createTitle: "สร้างผ่อนชำระ",
        editTitle: "แก้ไขผ่อนชำระ",
        subtitle: "ติดตามค่างวดที่สร้างรายการรายเดือนอัตโนมัติ และแก้ไขหรือลบรายการที่ลงผิดได้",
        saveFailed: "บันทึกรายการผ่อนไม่สำเร็จ",
        updateFailed: "แก้ไขรายการผ่อนไม่สำเร็จ",
        deleteFailed: "ลบรายการผ่อนไม่สำเร็จ",
        deleteConfirm: "ลบรายการผ่อนนี้ใช่ไหม",
        edit: "แก้ไข",
        delete: "ลบ",
        cancelEdit: "ยกเลิกการแก้ไข",
        update: "บันทึกการแก้ไข",
        editingBadge: "กำลังแก้ไข"
      }
    : {
        createTitle: "Create installment",
        editTitle: "Edit installment",
        subtitle: "Track recurring installment payments and fix mistakes by editing or deleting them.",
        saveFailed: "Failed to save installment",
        updateFailed: "Failed to update installment",
        deleteFailed: "Failed to delete installment",
        deleteConfirm: "Delete this installment?",
        edit: "Edit",
        delete: "Delete",
        cancelEdit: "Cancel edit",
        update: "Save changes",
        editingBadge: "Editing"
      };
}

function SegmentedButtonGroup<T extends string>({
  value,
  options,
  onChange,
  className
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={["flex flex-wrap gap-1.5", className].filter(Boolean).join(" ")}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={selected ? "primary" : "secondary"}
            className={selected ? "h-7 min-w-fit rounded-lg px-2 text-[11px] shadow-none" : "h-7 min-w-fit rounded-lg px-2 text-[11px]"}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export function InstallmentsPage() {
  const { locale } = useLocale();
  const { currentCycle, installments, transactions, addInstallment, updateInstallment, deleteInstallment, users } = useFlowPayStore();
  const copy = installmentsCopy(locale);
  const compactFieldClass = "h-7 rounded-lg px-2.5 text-[13px]";
  const [title, setTitle] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("10");
  const [currentInstallment, setCurrentInstallment] = useState("1");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(currentCycle.endDate);
  const [payerUserId, setPayerUserId] = useState(users[0].id);
  const [splitType, setSplitType] = useState<SplitType>("split_half");
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const payerOptions = users.map((user) => ({
    value: user.id,
    label: user.displayName
  }));
  const splitOptions = splitTypeOptions.map((option) => ({
    value: option.value,
    label: t(locale, option.labelKey)
  }));

  function resetForm() {
    setEditingInstallmentId(null);
    setTitle("");
    setTotalInstallments("10");
    setCurrentInstallment("1");
    setMonthlyAmount("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(currentCycle.endDate);
    setPayerUserId(users[0].id);
    setSplitType("split_half");
    setSubmitError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    const parsedTotal = Number(totalInstallments);
    const parsedCurrent = Number(currentInstallment);
    const parsedAmount = Number(monthlyAmount);

    if (!title.trim() || parsedTotal <= 0 || parsedCurrent <= 0 || parsedCurrent > parsedTotal || parsedAmount <= 0) return;

    const payload = {
      title,
      totalInstallments: parsedTotal,
      currentInstallment: parsedCurrent,
      monthlyAmount: parsedAmount,
      startDate,
      endDate,
      payerUserId,
      splitType
    };

    try {
      setIsSaving(true);
      if (editingInstallmentId) {
        await updateInstallment(editingInstallmentId, payload);
      } else {
        await addInstallment(payload);
      }
      resetForm();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : editingInstallmentId ? copy.updateFailed : copy.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(installmentId: string) {
    const installment = installments.find((item) => item.id === installmentId);
    if (!installment) return;

    setEditingInstallmentId(installment.id);
    setTitle(installment.title);
    setTotalInstallments(String(installment.totalInstallments));
    setCurrentInstallment(String(installment.currentInstallment));
    setMonthlyAmount(String(installment.monthlyAmount));
    setStartDate(installment.startDate);
    setEndDate(installment.endDate);
    setPayerUserId(installment.payerUserId);
    setSplitType(installment.splitType);
    setSubmitError("");
  }

  async function handleDelete(installmentId: string) {
    if (!window.confirm(copy.deleteConfirm)) return;
    try {
      await deleteInstallment(installmentId);
      if (editingInstallmentId === installmentId) {
        resetForm();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.deleteFailed);
    }
  }

  return (
    <div className="grid gap-2.5 xl:grid-cols-[0.92fr_1.08fr]">
      <Card className="overflow-hidden p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
            <Repeat className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-xl">{editingInstallmentId ? copy.editTitle : copy.createTitle}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
          </div>
        </div>

        <form className="mt-3 space-y-1.5" onSubmit={handleSubmit}>
          <Field label={t(locale, "installmentTitle")}>
            <Input className={compactFieldClass} placeholder={t(locale, "installmentTitle")} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-1.5">
            <Field label={t(locale, "totalInstallments")}>
              <Input className={compactFieldClass} type="number" min="1" value={totalInstallments} onChange={(event) => setTotalInstallments(event.target.value)} />
            </Field>
            <Field label={t(locale, "currentInstallment")}>
              <Input className={compactFieldClass} type="number" min="1" value={currentInstallment} onChange={(event) => setCurrentInstallment(event.target.value)} />
            </Field>
          </div>
          <Field label={t(locale, "monthlyAmount")}>
            <Input className={compactFieldClass} type="number" min="0" step="0.01" value={monthlyAmount} onChange={(event) => setMonthlyAmount(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-1.5">
            <Field label={t(locale, "startDate")}>
              <Input className={compactFieldClass} type="date" aria-label={t(locale, "startDate")} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label={t(locale, "endDate")}>
              <Input className={compactFieldClass} type="date" aria-label={t(locale, "endDate")} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </Field>
          </div>
          <Field label={t(locale, "paid")}>
            <SegmentedButtonGroup value={payerUserId} options={payerOptions} onChange={setPayerUserId} />
          </Field>
          <Field label={t(locale, "settlement")}>
            <SegmentedButtonGroup value={splitType} options={splitOptions} onChange={(value) => setSplitType(value as SplitType)} />
          </Field>
          <div className="grid grid-cols-2 gap-1">
            {editingInstallmentId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full whitespace-nowrap px-2 text-[11px] !text-red-500 hover:bg-red-50 hover:!text-red-600 dark:hover:bg-red-500/10 dark:hover:!text-red-400"
                onClick={resetForm}
              >
                <X className="h-4 w-4" />
                {copy.cancelEdit}
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Button type="submit" size="sm" className="h-7 w-full whitespace-nowrap px-2 text-[11px]" disabled={isSaving}>
              {editingInstallmentId ? copy.update : t(locale, "save")}
            </Button>
          </div>
          {submitError ? <p className="text-sm text-red-500">{submitError}</p> : null}
        </form>
      </Card>

      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold sm:text-xl">{t(locale, "installments")}</h2>
          <Repeat className="h-5 w-5 text-teal-600 dark:text-teal-300" />
        </div>
        <div className="mt-3 space-y-1.5">
          {installments.map((item) => {
            const currentCycleTransaction = transactions.find(
              (transaction) => transaction.installmentId === item.id && transaction.billingCycleId === currentCycle.id
            );
            const parsedProgress = currentCycleTransaction ? parseInstallmentProgress(currentCycleTransaction.title) : null;
            const displayInstallmentNumber = parsedProgress?.installmentNumber ?? item.currentInstallment;
            const progress = Math.round((displayInstallmentNumber / item.totalInstallments) * 100);
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge>{t(locale, splitTypeOptions.find((option) => option.value === item.splitType)?.labelKey ?? "splitHalf")}</Badge>
                    <h3 className="mt-1.5 truncate text-base font-bold">{item.title}</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {displayInstallmentNumber}/{item.totalInstallments} {t(locale, "paidProgress")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-black">{formatTHB(item.monthlyAmount)}</p>
                    {editingInstallmentId === item.id ? (
                      <p className="mt-1 text-[11px] font-semibold text-teal-600 dark:text-teal-300">{copy.editingBadge}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Button type="button" size="sm" variant="secondary" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => startEditing(item.id)}>
                    <Pencil className="h-4 w-4" />
                    {copy.edit}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-lg px-2 text-[11px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={() => void handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {copy.delete}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
