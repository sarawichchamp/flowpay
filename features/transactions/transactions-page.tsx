"use client";

import { FormEvent, useEffect, useState } from "react";
import { Camera, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n/dictionary";
import type { SplitType, Transaction, TransactionType, TransactionTypePreset } from "@/types/domain";
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

function createDraftTransaction(userId: string, transactionTypePresets: TransactionTypePreset[]): DraftTransaction {
  const presetId = getDefaultPresetId(transactionTypePresets, "food");
  return {
    localId: crypto.randomUUID(),
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

export function TransactionsPage() {
  const { locale } = useLocale();
  const { currentCycle, transactions, addTransactions, updateTransaction, deleteTransaction, resetDemoData, users, mode, transactionTypePresets } =
    useFlowPayStore();
  const copy = transactionsCopy(locale);
  const [drafts, setDrafts] = useState<DraftTransaction[]>([createDraftTransaction(users[0].id, transactionTypePresets)]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftTransaction>(createDraftTransaction(users[0].id, transactionTypePresets));
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDrafts((current) => (current.length ? current : [createDraftTransaction(users[0].id, transactionTypePresets)]));
  }, [transactionTypePresets, users]);

  function resetBatchForm() {
    setDrafts([createDraftTransaction(users[0].id, transactionTypePresets)]);
    setSubmitError("");
  }

  function resetEditForm() {
    setEditingTransactionId(null);
    setEditDraft(createDraftTransaction(users[0].id, transactionTypePresets));
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
    setDrafts((current) => [...current, createDraftTransaction(users[0].id, transactionTypePresets)]);
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
            <div className="grid gap-2.5 md:grid-cols-[1.2fr_0.8fr_0.9fr]">
              <Field label={t(locale, "title")}>
                <Input value={editDraft.title} onChange={(event) => updateEditDraft({ title: event.target.value })} />
              </Field>
              <Field label={t(locale, "date")}>
                <Input type="date" value={editDraft.date} onChange={(event) => updateEditDraft({ date: event.target.value })} />
              </Field>
              <Field label={t(locale, "amount")}>
                <Input
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
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10"
                  value={editDraft.transactionPresetId}
                  onChange={(event) => updateEditDraft({ transactionPresetId: event.target.value })}
                >
                  {transactionTypePresets.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              {editDraft.transactionType !== "food" ? (
                <Field label={t(locale, "settlement")}>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10"
                    value={editDraft.splitType}
                    onChange={(event) => updateEditDraft({ splitType: event.target.value as SplitType })}
                  >
                    {splitTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(locale, option.labelKey)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label={t(locale, "paid")}>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10"
                  value={editDraft.payerUserId}
                  onChange={(event) => updateEditDraft({ payerUserId: event.target.value })}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} {t(locale, "paid")}
                    </option>
                  ))}
                </select>
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
              <div key={draft.localId} className="rounded-xl border border-slate-200 p-2.5 dark:border-white/10">
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
                    <span className="sm:hidden">{t(locale, "delete")}</span>
                    <span className="hidden sm:inline">{copy.removeRow}</span>
                  </Button>
                </div>
                <div className="grid gap-2.5 md:grid-cols-[1.3fr_0.75fr_0.75fr]">
                  <Field label={t(locale, "title")}>
                    <Input value={draft.title} onChange={(event) => updateDraft(draft.localId, { title: event.target.value })} />
                  </Field>
                  <Field label={t(locale, "date")}>
                    <Input type="date" value={draft.date} onChange={(event) => updateDraft(draft.localId, { date: event.target.value })} />
                  </Field>
                  <Field label={t(locale, "amount")}>
                    <Input
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
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10"
                      value={draft.transactionPresetId}
                      onChange={(event) => updateDraft(draft.localId, { transactionPresetId: event.target.value })}
                    >
                      {transactionTypePresets.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {draft.transactionType !== "food" ? (
                    <Field label={t(locale, "settlement")}>
                      <select
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10"
                        value={draft.splitType}
                        onChange={(event) => updateDraft(draft.localId, { splitType: event.target.value as SplitType })}
                      >
                        {splitTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(locale, option.labelKey)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                  <Field label={t(locale, "paid")}>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/10"
                      value={draft.payerUserId}
                      onChange={(event) => updateDraft(draft.localId, { payerUserId: event.target.value })}
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.displayName} {t(locale, "paid")}
                        </option>
                      ))}
                    </select>
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
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[auto_auto_1fr_auto]">
              <Button type="button" variant="ghost" onClick={() => (mode === "demo" ? resetDemoData() : resetBatchForm())}>
                {copy.reset}
              </Button>
              <Button type="button" variant="secondary" onClick={addRow}>
                <Plus className="h-4 w-4" />
                {copy.addRow}
              </Button>
              <div className="hidden xl:block" />
              <Button type="submit" disabled={isSaving}>
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
    </div>
  );
}
