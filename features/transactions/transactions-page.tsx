"use client";

import { FormEvent, useEffect, useState } from "react";
import { Camera, ExternalLink, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n/dictionary";
import type { SplitType, Transaction, TransactionType, TransactionTypePreset } from "@/types/domain";
import { cn } from "@/utils/cn";
import { formatTHB } from "@/utils/currency";
import { formatShortDate, getCurrentDateStringInTimeZone } from "@/utils/date";
import { transactionAttachmentFileSchema } from "@/utils/validation";

type DraftTransaction = {
  localId: string;
  title: string;
  date: string;
  amount: string;
  payerUserId: string;
  transactionPresetId: string;
  transactionType: TransactionType;
  splitType: SplitType;
  attachmentFile: File | null;
  attachmentUrl: string | null;
  attachmentName: string;
};

const splitTypeOptions: Array<{ value: SplitType; labelKey: "splitHalf" | "noSplit" | "fullReimburse" }> = [
  { value: "split_half", labelKey: "splitHalf" },
  { value: "no_split", labelKey: "noSplit" },
  { value: "full_reimburse", labelKey: "fullReimburse" }
];

function transactionsCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        addTitle: "สร้างหลายธุรกรรม",
        editTitle: "แก้ไขธุรกรรม",
        subtitle: "เพิ่มหลายรายการในครั้งเดียวได้ และแก้ไขหรือลบรายการที่ลงผิดจากรายการด้านขวา",
        typeLabel: "ประเภทรายการ",
        saveFailed: "บันทึกรายการไม่สำเร็จ",
        updateFailed: "แก้ไขรายการไม่สำเร็จ",
        deleteFailed: "ลบรายการไม่สำเร็จ",
        deleteConfirm: "ลบรายการนี้ใช่ไหม",
        addRow: "เพิ่มแถว",
        removeRow: "ลบแถว",
        saveAll: "บันทึกทั้งหมด",
        edit: "แก้ไข",
        delete: "ลบ",
        cancelEdit: "ยกเลิกการแก้ไข",
        update: "บันทึกการแก้ไข",
        lockedInstallment: "รายการผ่อนชำระ ให้จัดการจากหน้าผ่อนชำระ",
        reset: "Reset",
        editingBadge: "กำลังแก้ไข",
        rowLabel: "รายการ",
        attachmentFailed: "อัปโหลดไฟล์แนบไม่สำเร็จ",
        selectedFile: "ไฟล์แนบ",
        openAttachment: "เปิดไฟล์แนบ"
      }
    : {
        addTitle: "Create multiple transactions",
        editTitle: "Edit transaction",
        subtitle: "Create several entries at once, then edit or delete mistakes from the list on the right.",
        typeLabel: "Transaction type",
        saveFailed: "Failed to save transactions",
        updateFailed: "Failed to update transaction",
        deleteFailed: "Failed to delete transaction",
        deleteConfirm: "Delete this transaction?",
        addRow: "Add row",
        removeRow: "Remove row",
        saveAll: "Save all",
        edit: "Edit",
        delete: "Delete",
        cancelEdit: "Cancel edit",
        update: "Save changes",
        lockedInstallment: "Manage installment transactions from the Installments page",
        reset: "Reset",
        editingBadge: "Editing",
        rowLabel: "Item",
        attachmentFailed: "Failed to upload attachment",
        selectedFile: "Attachment",
        openAttachment: "Open attachment"
      };
}

function getAttachmentName(attachmentUrl?: string | null) {
  if (!attachmentUrl) return "";

  const trimmedUrl = attachmentUrl.split("?")[0] ?? attachmentUrl;
  const lastSegment = trimmedUrl.split("/").pop();
  if (!lastSegment) return "";

  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
}

function getDefaultPresetId(transactionTypePresets: TransactionTypePreset[], baseType: "food" | "normal" = "food") {
  return (
    transactionTypePresets.find((preset) => preset.baseType === baseType)?.id ??
    transactionTypePresets[0]?.id ??
    ""
  );
}

function resolvePreset(transactionTypePresets: TransactionTypePreset[], presetId: string) {
  return (
    transactionTypePresets.find((preset) => preset.id === presetId) ??
    transactionTypePresets[0] ?? {
      id: "",
      label: "Food",
      baseType: "food" as const
    }
  );
}

let draftIdCounter = 1;

function nextDraftLocalId() {
  draftIdCounter += 1;
  return `draft-${draftIdCounter}`;
}

function createDraftTransaction(userId: string, transactionTypePresets: TransactionTypePreset[], localId = "draft-1"): DraftTransaction {
  const presetId = getDefaultPresetId(transactionTypePresets, "food");
  return {
    localId,
    title: "",
    date: getCurrentDateStringInTimeZone(),
    amount: "",
    payerUserId: userId,
    transactionPresetId: presetId,
    transactionType: "food",
    splitType: "no_split",
    attachmentFile: null,
    attachmentUrl: null,
    attachmentName: ""
  };
}

async function uploadAttachment(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/attachments", {
    method: "POST",
    body: formData
  });

  const payload = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? "Failed to upload attachment");
  }

  return payload.url;
}

function AttachmentPicker({
  locale,
  inputId,
  fileName,
  disabled,
  onChange
}: {
  locale: "th" | "en";
  inputId: string;
  fileName: string;
  disabled: boolean;
  onChange: (file?: File) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor={inputId}
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/70 px-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/10"
      >
        <Camera className="h-4 w-4" />
        {t(locale, "attach")}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0])}
      />
      {fileName ? <p className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">{fileName}</p> : null}
    </div>
  );
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
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={selected ? "primary" : "secondary"}
            className={cn("min-w-fit rounded-xl", selected ? "shadow-none" : undefined)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export function TransactionsPage() {
  const { locale } = useLocale();
  const { currentCycle, transactions, addTransactions, updateTransaction, deleteTransaction, resetDemoData, users, mode, transactionTypePresets } =
    useFlowPayStore();
  const copy = transactionsCopy(locale);
  const compactFieldClass = "h-10 rounded-xl px-3 text-sm";
  const [drafts, setDrafts] = useState<DraftTransaction[]>([createDraftTransaction(users[0].id, transactionTypePresets)]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftTransaction>(createDraftTransaction(users[0].id, transactionTypePresets, "edit-draft"));
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDrafts((current) => (current.length ? current : [createDraftTransaction(users[0].id, transactionTypePresets)]));
  }, [transactionTypePresets, users]);

  useEffect(() => {
    if (!previewAttachmentUrl) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [previewAttachmentUrl]);

  function resetBatchForm() {
    setDrafts([createDraftTransaction(users[0].id, transactionTypePresets)]);
    setSubmitError("");
  }

  function confirmAndResetBatchForm() {
    const confirmMessage =
      locale === "th" ? "ยืนยันการรีเซ็ตข้อมูลในฟอร์มนี้?" : "Reset all current form rows?";
    if (!window.confirm(confirmMessage)) return;

    if (mode === "demo") {
      resetDemoData();
      return;
    }

    resetBatchForm();
  }

  function resetEditForm() {
    setEditingTransactionId(null);
    setEditDraft(createDraftTransaction(users[0].id, transactionTypePresets, "edit-draft"));
    setSubmitError("");
  }

  function updateDraft(localId: string, patch: Partial<DraftTransaction>) {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.localId !== localId) return draft;
        const next = { ...draft, ...patch };
        if (patch.transactionPresetId) {
          const preset = resolvePreset(transactionTypePresets, patch.transactionPresetId);
          next.transactionPresetId = preset.id;
          next.transactionType = preset.baseType;
        }
        if (next.transactionType === "food") {
          next.splitType = "no_split";
        }
        return next;
      })
    );
  }

  function updateEditDraft(patch: Partial<DraftTransaction>) {
    setEditDraft((current) => {
      const next = { ...current, ...patch };
      if (patch.transactionPresetId) {
        const preset = resolvePreset(transactionTypePresets, patch.transactionPresetId);
        next.transactionPresetId = preset.id;
        next.transactionType = preset.baseType;
      }
      if (next.transactionType === "food") {
        next.splitType = "no_split";
      }
      return next;
    });
  }

  function setDraftAttachment(localId: string, file?: File) {
    if (!file) return;

    const validation = transactionAttachmentFileSchema.safeParse(file);
    if (!validation.success) {
      setSubmitError(validation.error.issues[0]?.message ?? copy.attachmentFailed);
      return;
    }

    setSubmitError("");
    updateDraft(localId, {
      attachmentFile: file,
      attachmentName: file.name
    });
  }

  function setEditAttachment(file?: File) {
    if (!file) return;

    const validation = transactionAttachmentFileSchema.safeParse(file);
    if (!validation.success) {
      setSubmitError(validation.error.issues[0]?.message ?? copy.attachmentFailed);
      return;
    }

    setSubmitError("");
    updateEditDraft({
      attachmentFile: file,
      attachmentName: file.name
    });
  }

  async function resolveAttachmentUrl(draft: DraftTransaction) {
    if (draft.attachmentFile) {
      if (mode === "production") {
        return uploadAttachment(draft.attachmentFile);
      }

      return URL.createObjectURL(draft.attachmentFile);
    }

    return draft.attachmentUrl;
  }

  function addRow() {
    setDrafts((current) => [...current, createDraftTransaction(users[0].id, transactionTypePresets, nextDraftLocalId())]);
  }

  function removeRow(localId: string) {
    setDrafts((current) => {
      const next = current.filter((draft) => draft.localId !== localId);
      return next.length ? next : [createDraftTransaction(users[0].id, transactionTypePresets)];
    });
  }

  async function handleBatchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const validDrafts = drafts.filter((draft) => draft.title.trim() && Number(draft.amount) > 0);
    if (!validDrafts.length) return;

    try {
      setIsSaving(true);
      const payloads = await Promise.all(
        validDrafts.map(async (draft) => ({
          billingCycleId: currentCycle.id,
          title: draft.title,
          date: draft.date,
          amount: Number(draft.amount),
          payerUserId: draft.payerUserId,
          transactionType: draft.transactionType,
          splitType: draft.transactionType === "food" ? "no_split" : draft.splitType,
          categoryId: draft.transactionType === "food" ? "food" : "other",
          attachmentUrl: (await resolveAttachmentUrl(draft)) ?? null
        }))
      );

      await addTransactions(payloads);
      resetBatchForm();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (!editingTransactionId) return;

    const parsedAmount = Number(editDraft.amount);
    if (!editDraft.title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    try {
      setIsSaving(true);
      await updateTransaction(editingTransactionId, {
        billingCycleId: currentCycle.id,
        title: editDraft.title,
        date: editDraft.date,
        amount: parsedAmount,
        payerUserId: editDraft.payerUserId,
        transactionType: editDraft.transactionType,
        splitType: editDraft.transactionType === "food" ? "no_split" : editDraft.splitType,
        categoryId: editDraft.transactionType === "food" ? "food" : "other",
        attachmentUrl: (await resolveAttachmentUrl(editDraft)) ?? null
      });
      resetEditForm();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.updateFailed);
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(transaction: Transaction) {
    if (transaction.transactionType === "installment") return;

    setEditingTransactionId(transaction.id);
    const preset = transactionTypePresets.find((item) => item.baseType === transaction.transactionType) ?? transactionTypePresets[0];
    setEditDraft({
      localId: transaction.id,
      title: transaction.title,
      date: transaction.date,
      amount: String(transaction.amount),
      payerUserId: transaction.payerUserId,
      transactionPresetId: preset?.id ?? "",
      transactionType: transaction.transactionType,
      splitType: transaction.transactionType === "food" ? "no_split" : transaction.splitType,
      attachmentFile: null,
      attachmentUrl: transaction.attachmentUrl ?? null,
      attachmentName: getAttachmentName(transaction.attachmentUrl)
    });
    setSubmitError("");
  }

  async function handleDelete(transaction: Transaction) {
    if (transaction.transactionType === "installment") return;
    if (!window.confirm(copy.deleteConfirm)) return;

    try {
      await deleteTransaction(transaction.id);
      if (editingTransactionId === transaction.id) {
        resetEditForm();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.deleteFailed);
    }
  }

  const previewIsPdf = previewAttachmentUrl?.toLowerCase().includes(".pdf") ?? false;
  const previewFileName = getAttachmentName(previewAttachmentUrl);
  const payerOptions = users.map((user) => ({
    value: user.id,
    label: user.displayName
  }));
  const presetOptions = transactionTypePresets.map((option) => ({
    value: option.id,
    label: option.label
  }));
  const splitOptions = splitTypeOptions.map((option) => ({
    value: option.value,
    label: t(locale, option.labelKey)
  }));

  return (
    <div className="grid gap-3 xl:grid-cols-[0.92fr_1.08fr]">
      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
            <Plus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-xl">{editingTransactionId ? copy.editTitle : copy.addTitle}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
          </div>
        </div>

        {editingTransactionId ? (
          <form className="mt-4 space-y-2.5" onSubmit={handleEditSubmit}>
            <Field label={t(locale, "title")}>
              <Input className={compactFieldClass} value={editDraft.title} onChange={(event) => updateEditDraft({ title: event.target.value })} />
            </Field>
            <div className="grid gap-2.5 grid-cols-2">
              <Field label={t(locale, "date")}>
                <Input className={compactFieldClass} type="date" value={editDraft.date} onChange={(event) => updateEditDraft({ date: event.target.value })} />
              </Field>
              <Field label={t(locale, "amount")}>
                <Input
                  className={compactFieldClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={editDraft.amount}
                  onChange={(event) => updateEditDraft({ amount: event.target.value })}
                />
              </Field>
            </div>
            <div className={editDraft.transactionType === "food" ? "grid gap-2.5 md:grid-cols-[1fr_1fr]" : "grid gap-2.5 md:grid-cols-[1fr_1fr_1fr]"}>
              <Field label={copy.typeLabel}>
                <SegmentedButtonGroup
                  value={editDraft.transactionPresetId}
                  options={presetOptions}
                  onChange={(value) => updateEditDraft({ transactionPresetId: value })}
                />
              </Field>
              {editDraft.transactionType !== "food" ? (
                <Field label={t(locale, "settlement")}>
                  <SegmentedButtonGroup
                    value={editDraft.splitType}
                    options={splitOptions}
                    onChange={(value) => updateEditDraft({ splitType: value })}
                  />
                </Field>
              ) : null}
              <Field label={t(locale, "paid")}>
                <SegmentedButtonGroup
                  value={editDraft.payerUserId}
                  options={payerOptions}
                  onChange={(value) => updateEditDraft({ payerUserId: value })}
                />
              </Field>
            </div>
            <AttachmentPicker
              locale={locale}
              inputId={`transaction-edit-attachment-${editingTransactionId}`}
              fileName={editDraft.attachmentName}
              disabled={isSaving}
              onChange={setEditAttachment}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" variant="ghost" onClick={resetEditForm}>
                <X className="h-4 w-4" />
                {copy.cancelEdit}
              </Button>
              <div className="hidden flex-1 sm:block" />
              <Button type="submit" disabled={isSaving}>
                {copy.update}
              </Button>
            </div>
            {submitError ? <p className="text-sm text-red-500">{submitError}</p> : null}
          </form>
        ) : (
          <form className="mt-4 space-y-2.5" onSubmit={handleBatchSubmit}>
            {drafts.map((draft, index) => (
              <div key={draft.localId} className="rounded-xl border border-slate-200 p-2 dark:border-white/10">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {copy.rowLabel} {index + 1}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0 px-2"
                    onClick={() => removeRow(draft.localId)}
                    disabled={drafts.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sm:hidden">{copy.delete}</span>
                    <span className="hidden sm:inline">{copy.removeRow}</span>
                  </Button>
                </div>
                <Field label={t(locale, "title")}>
                  <Input className={compactFieldClass} value={draft.title} onChange={(event) => updateDraft(draft.localId, { title: event.target.value })} />
                </Field>
                <div className="grid gap-2.5 grid-cols-2">
                  <Field label={t(locale, "date")}>
                    <Input className={compactFieldClass} type="date" value={draft.date} onChange={(event) => updateDraft(draft.localId, { date: event.target.value })} />
                  </Field>
                  <Field label={t(locale, "amount")}>
                    <Input
                      className={compactFieldClass}
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.amount}
                      onChange={(event) => updateDraft(draft.localId, { amount: event.target.value })}
                    />
                  </Field>
                </div>
                <div className={draft.transactionType === "food" ? "mt-2.5 grid gap-2.5 md:grid-cols-[1fr_1fr]" : "mt-2.5 grid gap-2.5 md:grid-cols-[1fr_1fr_1fr_1fr]"}>
                  <Field label={copy.typeLabel}>
                    <SegmentedButtonGroup
                      value={draft.transactionPresetId}
                      options={presetOptions}
                      onChange={(value) => updateDraft(draft.localId, { transactionPresetId: value })}
                    />
                  </Field>
                  {draft.transactionType !== "food" ? (
                    <Field label={t(locale, "settlement")}>
                      <SegmentedButtonGroup
                        value={draft.splitType}
                        options={splitOptions}
                        onChange={(value) => updateDraft(draft.localId, { splitType: value })}
                      />
                    </Field>
                  ) : null}
                  <Field label={t(locale, "paid")}>
                    <SegmentedButtonGroup
                      value={draft.payerUserId}
                      options={payerOptions}
                      onChange={(value) => updateDraft(draft.localId, { payerUserId: value })}
                    />
                  </Field>
                </div>
                <div className="mt-2.5">
                  <AttachmentPicker
                    locale={locale}
                    inputId={`transaction-attachment-${draft.localId}`}
                    fileName={draft.attachmentName}
                    disabled={isSaving}
                    onChange={(file) => setDraftAttachment(draft.localId, file)}
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                onClick={confirmAndResetBatchForm}
              >
                {copy.reset}
              </Button>
              <Button type="button" variant="secondary" onClick={addRow}>
                <Plus className="h-4 w-4" />
                {copy.addRow}
              </Button>
              <Button type="submit" disabled={isSaving} className="ml-auto">
                {copy.saveAll}
              </Button>
            </div>
            {submitError ? <p className="text-sm text-red-500">{submitError}</p> : null}
          </form>
        )}
      </Card>

      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold sm:text-xl">{t(locale, "transactions")}</h2>
          <ReceiptText className="h-5 w-5 text-teal-600 dark:text-teal-300" />
        </div>
        <div className="mt-3 space-y-1.5">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{transaction.title}</p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {formatShortDate(transaction.date)} · {transaction.transactionType}
                      {transaction.transactionType !== "food" ? ` · ${transaction.splitType}` : ""}
                      {transaction.attachmentUrl ? " · att" : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <div className="flex items-center gap-2">
                    {editingTransactionId === transaction.id ? (
                      <span className="shrink-0 text-[10px] font-semibold text-teal-600 dark:text-teal-300">{copy.editingBadge}</span>
                    ) : null}
                    <p className="shrink-0 text-sm font-black tabular-nums">{formatTHB(transaction.amount)}</p>
                  </div>
                  {transaction.transactionType === "installment" ? (
                    <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">lock</span>
                  ) : (
                    <div className="flex shrink-0 gap-1">
                      {transaction.attachmentUrl ? (
                        <button
                          type="button"
                          aria-label={copy.openAttachment}
                          onClick={() => setPreviewAttachmentUrl(transaction.attachmentUrl ?? null)}
                          className={cn(
                            "inline-flex h-9 items-center justify-center gap-2 rounded-2xl bg-white/70 px-2 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition active:scale-[0.98] hover:bg-white",
                            "dark:bg-white/10 dark:text-white dark:ring-white/10"
                          )}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      ) : null}
                      <Button type="button" size="sm" variant="secondary" className="px-2" onClick={() => startEditing(transaction)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={() => void handleDelete(transaction)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {previewAttachmentUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setPreviewAttachmentUrl(null)}>
          <Card className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold">{previewFileName || copy.openAttachment}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{previewIsPdf ? "PDF preview" : "Image preview"}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-2xl bg-white/70 px-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 transition hover:bg-white",
                    "dark:bg-white/10 dark:text-white dark:ring-white/10"
                  )}
                >
                  <ExternalLink className="h-4 w-4" />
                  {copy.openAttachment}
                </a>
                <Button type="button" size="sm" variant="ghost" className="px-2" onClick={() => setPreviewAttachmentUrl(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-slate-100 p-3 dark:bg-slate-950">
              {previewIsPdf ? (
                <iframe title={previewFileName || copy.openAttachment} src={previewAttachmentUrl} className="h-[72vh] w-full rounded-2xl bg-white" />
              ) : (
                <img src={previewAttachmentUrl} alt={previewFileName || copy.openAttachment} className="max-h-[72vh] w-full rounded-2xl object-contain bg-black/5" />
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
