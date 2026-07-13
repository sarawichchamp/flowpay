"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronDown, ExternalLink, Loader2, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
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

const mutedTextClass = "text-[var(--text-muted)]";
const softTextClass = "text-[var(--text-soft)]";
const accentTextClass = "text-[var(--accent-fg)]";
const dangerTextClass = "text-[var(--danger-fg)]";
const themedInlineActionClass =
  "bg-[var(--surface-muted)] text-[var(--app-fg)] ring-1 ring-[var(--control-border)] shadow-[var(--secondary-shadow)] hover:bg-[var(--control-hover)]";
const themedOverlayClass = "bg-[var(--overlay)]";
const themedPreviewCanvasClass = "bg-[var(--preview-bg)]";
const themedPreviewFrameClass = "bg-[var(--preview-frame-bg)]";

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

type TransactionSortKey = "createdAt" | "date";

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
        saving: "กำลังบันทึก...",
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
        openAttachment: "เปิดไฟล์แนบ",
        sortLabel: "เรียงตาม",
        sortCreatedAt: "วันที่สร้าง",
        sortDate: "วันที่ใช้จ่าย"
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
        saving: "Saving...",
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
        openAttachment: "Open attachment",
        sortLabel: "Sort",
        sortCreatedAt: "Created",
        sortDate: "Spent date"
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

function getDefaultSplitTypeForTransactionType(transactionType: TransactionType) {
  return transactionType === "food" ? "no_split" : "split_half";
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
    <div className="flex flex-wrap items-center gap-1.5">
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex h-6.5 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition",
          themedInlineActionClass
        )}
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
      {fileName ? <p className={cn("min-w-0 truncate text-[11px]", mutedTextClass)}>{fileName}</p> : null}
    </div>
  );
}

function SegmentedButtonGroup<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={selected ? "primary" : "secondary"}
            className={cn("h-7 min-w-fit rounded-lg px-2 text-[11px]", selected ? "shadow-none" : undefined, buttonClassName)}
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
  const compactFieldClass = "h-7 rounded-lg px-2.5 text-[13px]";
  const [drafts, setDrafts] = useState<DraftTransaction[]>([createDraftTransaction(users[0].id, transactionTypePresets)]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftTransaction>(createDraftTransaction(users[0].id, transactionTypePresets, "edit-draft"));
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sortBy, setSortBy] = useState<TransactionSortKey>("createdAt");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!sortMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [sortMenuOpen]);

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
          const previousTransactionType = draft.transactionType;
          next.transactionPresetId = preset.id;
          next.transactionType = preset.baseType;
          if (preset.baseType !== previousTransactionType) {
            next.splitType = getDefaultSplitTypeForTransactionType(preset.baseType);
          }
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
        const previousTransactionType = current.transactionType;
        next.transactionPresetId = preset.id;
        next.transactionType = preset.baseType;
        if (preset.baseType !== previousTransactionType) {
          next.splitType = getDefaultSplitTypeForTransactionType(preset.baseType);
        }
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
  const userNameById = new Map(users.map((user) => [user.id, user.displayName]));
  const activeSortLabel = sortBy === "createdAt" ? copy.sortCreatedAt : copy.sortDate;
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (sortBy === "date") {
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    }

    return b.createdAt.localeCompare(a.createdAt) || b.date.localeCompare(a.date);
  });

  return (
    <div className="grid gap-2.5 xl:grid-cols-[0.92fr_1.08fr]">
      <Card className="overflow-hidden p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-fg)]">
            <Plus className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-xl">{copy.addTitle}</h1>
            <p className={cn("text-xs", mutedTextClass)}>{copy.subtitle}</p>
          </div>
        </div>
        <form className="mt-3 space-y-1.5" onSubmit={handleBatchSubmit}>
          {drafts.map((draft, index) => (
            <div key={draft.localId} className="rounded-lg border border-[var(--border)] p-1.5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                <p className={cn("text-[11px] font-semibold", mutedTextClass)}>
                  {copy.rowLabel} {index + 1}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6.5 shrink-0 rounded-lg px-2 text-[11px]"
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
              <div className="grid grid-cols-2 gap-1.5 [&>*]:min-w-0">
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
              <div className={draft.transactionType === "food" ? "mt-1.5 grid gap-1.5 md:grid-cols-[1fr_1fr]" : "mt-1.5 grid gap-1.5 md:grid-cols-[1fr_1fr_1fr_1fr]"}>
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
              <div className="mt-1.5">
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
          <div className="grid grid-cols-3 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-full whitespace-nowrap px-2 text-[11px] !text-[var(--danger-fg)] hover:bg-[var(--danger-soft-bg)] hover:!text-[var(--danger-fg)]"
              onClick={confirmAndResetBatchForm}
            >
              {copy.reset}
            </Button>
            <Button type="button" variant="secondary" size="sm" className="h-7 w-full whitespace-nowrap px-2 text-[11px]" onClick={addRow} disabled={isSaving}>
              <Plus className="h-4 w-4" />
              {copy.addRow}
            </Button>
            <Button type="submit" size="sm" disabled={isSaving} className="h-7 w-full whitespace-nowrap px-2 text-[10px] sm:text-[11px]">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? copy.saving : copy.saveAll}
            </Button>
          </div>
          {isSaving ? <p className={cn("text-sm", accentTextClass)}>{copy.saving}</p> : null}
          {submitError ? <p className={cn("text-sm", dangerTextClass)}>{submitError}</p> : null}
        </form>
      </Card>

      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold sm:text-xl">{t(locale, "transactions")}</h2>
          <div ref={sortMenuRef} className="relative flex items-center gap-1.5">
            <ReceiptText className="h-4 w-4 text-[var(--accent-fg)]" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("h-4.5 rounded-md px-1 text-[8px] font-medium", mutedTextClass, "hover:bg-[var(--ghost-hover)] hover:text-[var(--app-fg)]")}
              onClick={() => setSortMenuOpen((current) => !current)}
            >
              {copy.sortLabel}: {activeSortLabel}
              <ChevronDown className={cn("h-2.5 w-2.5 transition", sortMenuOpen && "rotate-180")} />
            </Button>
            <AnimatePresence>
              {sortMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="absolute right-0 top-full z-10 mt-1 min-w-[84px] rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-1 shadow-lg backdrop-blur-[var(--surface-blur)]"
                >
                  {[
                    { value: "createdAt" as const, label: copy.sortCreatedAt },
                    { value: "date" as const, label: copy.sortDate }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-start rounded-md px-1 py-0.75 text-left text-[8px] font-medium transition",
                        sortBy === option.value
                          ? "bg-[var(--primary-bg)] text-[var(--primary-fg)]"
                          : cn(softTextClass, "hover:bg-[var(--ghost-hover)]")
                      )}
                      onClick={() => {
                        setSortBy(option.value);
                        setSortMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {sortedTransactions.map((transaction) => (
            <motion.div
              key={transaction.id}
              layout
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn(
                "rounded-xl border border-[var(--border)] px-3 py-2",
                editingTransactionId === transaction.id && "border-[var(--accent-border)] bg-[var(--accent-soft)]"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {editingTransactionId === transaction.id ? (
                  <motion.form
                    key="edit"
                    layout
                    initial={{ opacity: 0, y: 6, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.99 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="space-y-1.5"
                    onSubmit={handleEditSubmit}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-[11px] font-semibold", accentTextClass)}>{copy.editingBadge}</p>
                      <p className="text-sm font-black tabular-nums">{formatTHB(Number(editDraft.amount || 0))}</p>
                    </div>
                    <Field label={t(locale, "title")}>
                      <Input className={compactFieldClass} value={editDraft.title} onChange={(event) => updateEditDraft({ title: event.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-1.5 [&>*]:min-w-0">
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
                    <AttachmentPicker
                      locale={locale}
                      inputId={`transaction-edit-attachment-${transaction.id}`}
                      fileName={editDraft.attachmentName}
                      disabled={isSaving}
                      onChange={setEditAttachment}
                    />
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex gap-1">
                        {editDraft.attachmentUrl ? (
                          <button
                            type="button"
                            aria-label={copy.openAttachment}
                            onClick={() => setPreviewAttachmentUrl(editDraft.attachmentUrl ?? null)}
                            className={cn(
                              "inline-flex h-7 items-center justify-center gap-2 rounded-lg px-2 text-[11px] font-semibold transition active:scale-[0.98]",
                              themedInlineActionClass
                            )}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={resetEditForm}>
                          <X className="h-3.5 w-3.5" />
                          {copy.cancelEdit}
                        </Button>
                        <Button type="submit" size="sm" className="h-7 px-2 text-[11px]" disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {isSaving ? copy.saving : copy.update}
                        </Button>
                      </div>
                    </div>
                    {isSaving ? <p className={cn("text-sm", accentTextClass)}>{copy.saving}</p> : null}
                    {submitError ? <p className={cn("text-sm", dangerTextClass)}>{submitError}</p> : null}
                  </motion.form>
                ) : (
                  <motion.div
                    key="display"
                    layout
                    initial={{ opacity: 0.92, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0.92, y: -2 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{transaction.title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <p className="shrink-0 text-sm font-black tabular-nums">{formatTHB(transaction.amount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={cn("min-w-0 flex-1 truncate text-[11px] font-medium", mutedTextClass)}>
                        {formatShortDate(transaction.date)} · {transaction.transactionType}
                        {transaction.transactionType !== "food" ? ` · ${transaction.splitType}` : ""}
                        {` · ${userNameById.get(transaction.payerUserId) ?? "-"}`}
                        {transaction.attachmentUrl ? " · att" : ""}
                      </p>
                      {transaction.transactionType === "installment" ? (
                        <span className={cn("shrink-0 text-[10px]", mutedTextClass)}>lock</span>
                      ) : (
                        <div className="flex shrink-0 gap-1">
                          {transaction.attachmentUrl ? (
                            <button
                              type="button"
                              aria-label={copy.openAttachment}
                              onClick={() => setPreviewAttachmentUrl(transaction.attachmentUrl ?? null)}
                              className={cn(
                                "inline-flex h-9 items-center justify-center gap-2 rounded-2xl px-2 text-sm font-semibold transition active:scale-[0.98]",
                                themedInlineActionClass
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
                            className="px-2 text-[var(--danger-fg)] hover:bg-[var(--danger-soft-bg)]"
                            onClick={() => void handleDelete(transaction)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </Card>

      {previewAttachmentUrl ? (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm", themedOverlayClass)} onClick={() => setPreviewAttachmentUrl(null)}>
          <Card className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold">{previewFileName || copy.openAttachment}</h3>
                <p className={cn("mt-1 text-xs", mutedTextClass)}>{previewIsPdf ? "PDF preview" : "Image preview"}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold transition",
                    themedInlineActionClass
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
            <div className={cn("p-3", themedPreviewCanvasClass)}>
              {previewIsPdf ? (
                <iframe title={previewFileName || copy.openAttachment} src={previewAttachmentUrl} className={cn("h-[72vh] w-full rounded-2xl", themedPreviewFrameClass)} />
              ) : (
                <img src={previewAttachmentUrl} alt={previewFileName || copy.openAttachment} className={cn("max-h-[72vh] w-full rounded-2xl object-contain", themedPreviewFrameClass)} />
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
