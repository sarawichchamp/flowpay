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

export function InstallmentsPage() {
  const { locale } = useLocale();
  const { currentCycle, installments, transactions, addInstallment, updateInstallment, deleteInstallment, users } = useFlowPayStore();
  const copy = installmentsCopy(locale);
  const compactFieldClass = "h-10 rounded-xl px-3 text-sm";
  const compactSelectClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10";
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
    <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
            <Repeat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold sm:text-xl">{editingInstallmentId ? copy.editTitle : copy.createTitle}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
          </div>
        </div>

        <form className="mt-4 space-y-2.5" onSubmit={handleSubmit}>
          <Field label={t(locale, "installmentTitle")}>
            <Input className={compactFieldClass} placeholder={t(locale, "installmentTitle")} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label={t(locale, "startDate")}>
              <Input className={compactFieldClass} type="date" aria-label={t(locale, "startDate")} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label={t(locale, "endDate")}>
              <Input className={compactFieldClass} type="date" aria-label={t(locale, "endDate")} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </Field>
          </div>
          <Field label={t(locale, "paid")}>
            <select
              className={compactSelectClass}
              value={payerUserId}
              onChange={(event) => setPayerUserId(event.target.value)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} {t(locale, "paid")}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t(locale, "settlement")}>
            <select
              className={compactSelectClass}
              value={splitType}
              onChange={(event) => setSplitType(event.target.value as SplitType)}
            >
              {splitTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(locale, option.labelKey)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            {editingInstallmentId ? (
              <Button type="button" variant="ghost" onClick={resetForm}>
                <X className="h-4 w-4" />
                {copy.cancelEdit}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" className="w-full" disabled={isSaving}>
              {editingInstallmentId ? copy.update : t(locale, "save")}
            </Button>
          </div>
          {submitError ? <p className="text-sm text-red-500">{submitError}</p> : null}
        </form>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-black">{t(locale, "installments")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <div className="grid gap-4">
          {installments.map((item) => {
            const currentCycleTransaction = transactions.find(
              (transaction) => transaction.installmentId === item.id && transaction.billingCycleId === currentCycle.id
            );
            const parsedProgress = currentCycleTransaction ? parseInstallmentProgress(currentCycleTransaction.title) : null;
            const displayInstallmentNumber = parsedProgress?.installmentNumber ?? item.currentInstallment;
            const progress = Math.round((displayInstallmentNumber / item.totalInstallments) * 100);
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge>{t(locale, splitTypeOptions.find((option) => option.value === item.splitType)?.labelKey ?? "splitHalf")}</Badge>
                    <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {displayInstallmentNumber}/{item.totalInstallments} {t(locale, "paidProgress")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black">{formatTHB(item.monthlyAmount)}</p>
                    {editingInstallmentId === item.id ? (
                      <p className="mt-2 text-xs font-semibold text-teal-600 dark:text-teal-300">{copy.editingBadge}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => startEditing(item.id)}>
                    <Pencil className="h-4 w-4" />
                    {copy.edit}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={() => void handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {copy.delete}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
