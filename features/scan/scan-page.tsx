"use client";

import { FormEvent, useEffect, useState } from "react";
import { Camera, CheckCircle2, Loader2, Plus, ReceiptText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { type ReceiptOcrField, runReceiptOcr, type ReceiptOcrDocumentType, type ReceiptOcrLineItem } from "@/services/ocr/receipt-ocr";
import type { SplitType, TransactionType } from "@/types/domain";
import { getCategoryLabel, resolveCategoryId } from "@/utils/categories";
import { formatTHB } from "@/utils/currency";
import { receiptFileSchema } from "@/utils/validation";

type ReviewLine = {
  id: string;
  title: string;
  amount: string;
  categoryId: string;
  include: boolean;
  note: string;
  quantity: string;
  sourceLine: string;
};

type ReviewDraft = {
  documentType: ReceiptOcrDocumentType;
  title: string;
  date: string;
  payerUserId: string;
  transactionType: TransactionType;
  splitType: SplitType;
  fields: Record<string, string>;
  lines: ReviewLine[];
  rawText: string;
};

function scanCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        uploadTitle: "สแกนสลิปหรือใบเสร็จ",
        uploadSubtitle: "หลัง OCR จะแตกเป็นรายการให้ตรวจทีละบรรทัด ช่องไหนหาไม่เจอจะปล่อยว่างไว้ให้แก้ก่อนยืนยัน",
        reviewTitle: "ตรวจสอบก่อนยืนยัน",
        sharedTitle: "ข้อมูลหลัก",
        extractedTitle: "ข้อมูลที่อ่านได้",
        lineItemsTitle: "รายการที่จะแตกเป็นบรรทัด",
        rawTextTitle: "ข้อความ OCR ดิบ",
        uploadHint: "รองรับ JPG, PNG และ WebP",
        addRow: "เพิ่มบรรทัด",
        confirmSave: "ยืนยันและบันทึก",
        saving: "กำลังบันทึก...",
        noLines: "ยังไม่มีรายการที่พร้อมบันทึก",
        selectedTotal: "ยอดรวมที่เลือก",
        includeRow: "รวมบรรทัดนี้",
        lineNote: "หมายเหตุ",
        sourceLine: "บรรทัดต้นฉบับ",
        quantity: "จำนวน",
        documentType: "ประเภทเอกสาร",
        receipt: "ใบเสร็จ",
        transfer: "สลิปโอนเงิน",
        merchant: "ร้าน/ปลายทาง",
        reference: "เลขอ้างอิง",
        sourceName: "ชื่อผู้โอน",
        sourceAccount: "บัญชีต้นทาง",
        destinationName: "ชื่อผู้รับ",
        destinationAccount: "บัญชีปลายทาง",
        paymentMethod: "วิธีจ่าย",
        fee: "ค่าธรรมเนียม",
        time: "เวลา",
        title: "ชื่อรายการหลัก",
        saveSuccess: "บันทึกรายการจากการสแกนเรียบร้อย",
        saveFailed: "บันทึกข้อมูลจากการสแกนไม่สำเร็จ",
        fillMissing: "ช่องที่เว้นว่างสามารถพิมพ์แก้เองได้",
        detectedLines: "รายการที่ OCR แยกได้",
        fallbackTitle: "รายการจากการสแกน",
        uploadImage: "อัปโหลดรูป",
        invalidSelection: "กรุณาเลือกอย่างน้อย 1 บรรทัดที่มีชื่อและจำนวนเงิน",
        attachOriginal: "แนบรูปต้นฉบับไปกับทุกรายการ",
        autoSplitHint: "เลือกประเภทและการหารก่อนยืนยันได้"
      }
    : {
        uploadTitle: "Scan slip or receipt",
        uploadSubtitle: "After OCR, we break the document into editable rows. Missing fields stay blank so you can review them before confirming.",
        reviewTitle: "Review before confirming",
        sharedTitle: "Shared details",
        extractedTitle: "Extracted fields",
        lineItemsTitle: "Line items to save",
        rawTextTitle: "Raw OCR text",
        uploadHint: "Supports JPG, PNG, and WebP",
        addRow: "Add row",
        confirmSave: "Confirm and save",
        saving: "Saving...",
        noLines: "No valid rows yet",
        selectedTotal: "Selected total",
        includeRow: "Include this row",
        lineNote: "Note",
        sourceLine: "Source line",
        quantity: "Qty",
        documentType: "Document type",
        receipt: "Receipt",
        transfer: "Transfer slip",
        merchant: "Store / destination",
        reference: "Reference",
        sourceName: "Sender name",
        sourceAccount: "Source account",
        destinationName: "Recipient name",
        destinationAccount: "Destination account",
        paymentMethod: "Payment method",
        fee: "Fee",
        time: "Time",
        title: "Primary title",
        saveSuccess: "Saved scanned transactions",
        saveFailed: "Failed to save scanned transactions",
        fillMissing: "Blank fields are intentional so you can correct them manually.",
        detectedLines: "OCR line candidates",
        fallbackTitle: "Scanned item",
        uploadImage: "Upload image",
        invalidSelection: "Select at least one row with a title and amount.",
        attachOriginal: "Attach the original image to every transaction",
        autoSplitHint: "You can adjust transaction type and split rule before saving."
      };
}

const transactionTypeOptions: Array<{ value: TransactionType; label: { th: string; en: string } }> = [
  { value: "food", label: { th: "ค่าอาหาร", en: "Food" } },
  { value: "normal", label: { th: "ค่าใช้จ่ายทั่วไป", en: "Normal expense" } }
];

const splitTypeOptions: Array<{ value: SplitType; label: { th: string; en: string } }> = [
  { value: "no_split", label: { th: "ส่วนตัว ไม่หาร", en: "No split" } },
  { value: "split_half", label: { th: "หารครึ่ง", en: "Split half" } },
  { value: "full_reimburse", label: { th: "คืนเต็มจำนวน", en: "Full reimburse" } }
];

const fieldOrder = [
  "merchant",
  "sourceName",
  "sourceAccount",
  "destinationName",
  "destinationAccount",
  "paymentMethod",
  "reference",
  "fee",
  "time"
] as const;

function fieldLabel(key: string, copy: ReturnType<typeof scanCopy>) {
  switch (key) {
    case "merchant":
      return copy.merchant;
    case "sourceName":
      return copy.sourceName;
    case "sourceAccount":
      return copy.sourceAccount;
    case "destinationName":
      return copy.destinationName;
    case "destinationAccount":
      return copy.destinationAccount;
    case "paymentMethod":
      return copy.paymentMethod;
    case "reference":
      return copy.reference;
    case "fee":
      return copy.fee;
    case "time":
      return copy.time;
    default:
      return key;
  }
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

function buildFieldState(fields: ReceiptOcrField[], fallbackMerchant: string) {
  const result: Record<string, string> = Object.fromEntries(fieldOrder.map((key) => [key, ""]));

  for (const field of fields) {
    result[field.key] = field.value;
  }

  if (!result.merchant) {
    result.merchant = fallbackMerchant;
  }

  return result;
}

function createLineDraft(line: ReceiptOcrLineItem, fallbackCategoryId: string): ReviewLine {
  return {
    id: line.id,
    title: line.title,
    amount: line.amount?.toString() ?? "",
    categoryId: line.categoryHint ?? fallbackCategoryId,
    include: Boolean(line.title && line.amount),
    note: "",
    quantity: line.quantity,
    sourceLine: line.sourceLine
  };
}

function emptyLine(fallbackCategoryId: string): ReviewLine {
  return {
    id: crypto.randomUUID(),
    title: "",
    amount: "",
    categoryId: fallbackCategoryId,
    include: true,
    note: "",
    quantity: "",
    sourceLine: ""
  };
}

export function ScanPage() {
  const { locale } = useLocale();
  const copy = scanCopy(locale);
  const { currentCycle, addTransactions, users, mode, categories } = useFlowPayStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  async function handleFile(file?: File) {
    if (!file) return;
    setError(null);
    setSuccess("");
    const validation = receiptFileSchema.safeParse(file);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? copy.uploadHint);
      return;
    }

    setSelectedFile(file);
    setLoading(true);

    try {
      const result = await runReceiptOcr(file);
      const fallbackCategoryId = result.documentType === "receipt" ? "food" : "other";
      const lineDrafts =
        result.lineItems.length > 0
          ? result.lineItems.map((line) => createLineDraft(line, fallbackCategoryId))
          : [
              {
                id: crypto.randomUUID(),
                title: result.title || copy.fallbackTitle,
                amount: result.amount?.toString() ?? "",
                categoryId: fallbackCategoryId,
                include: Boolean(result.amount),
                note: "",
                quantity: "",
                sourceLine: result.title || copy.fallbackTitle
              }
            ];

      setDraft({
        documentType: result.documentType,
        title: result.title || copy.fallbackTitle,
        date: result.date || new Date().toISOString().slice(0, 10),
        payerUserId: users[0]?.id ?? "",
        transactionType: result.documentType === "receipt" ? "food" : "normal",
        splitType: "no_split",
        fields: buildFieldState(result.fields, result.title),
        lines: lineDrafts,
        rawText: result.rawText
      });
    } catch {
      setError(locale === "th" ? "OCR ไม่สำเร็จ กรุณาลองอัปโหลดใหม่หรือแก้ข้อมูลเอง" : "OCR failed. Please try again or fill the data manually.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraftField(key: keyof ReviewDraft, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateExtractedField(key: string, value: string) {
    setDraft((current) => (current ? { ...current, fields: { ...current.fields, [key]: value } } : current));
  }

  function updateLine(lineId: string, patch: Partial<ReviewLine>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
          }
        : current
    );
  }

  function addLine() {
    setDraft((current) =>
      current
        ? {
            ...current,
            lines: [...current.lines, emptyLine(current.documentType === "receipt" ? "food" : "other")]
          }
        : current
    );
  }

  function removeLine(lineId: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            lines: current.lines.length > 1 ? current.lines.filter((line) => line.id !== lineId) : current.lines
          }
        : current
    );
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    const selectedLines = draft.lines.filter((line) => {
      const amount = Number(line.amount);
      return line.include && line.title.trim() && Number.isFinite(amount) && amount > 0;
    });

    if (!selectedLines.length) {
      setError(copy.invalidSelection);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess("");

    try {
      const attachmentUrl =
        selectedFile && mode === "production"
          ? await uploadAttachment(selectedFile)
          : selectedFile
            ? URL.createObjectURL(selectedFile)
            : null;

      const sharedNotes = [
        draft.fields.reference ? `ref: ${draft.fields.reference}` : "",
        draft.fields.sourceName ? `from: ${draft.fields.sourceName}` : "",
        draft.fields.destinationName ? `to: ${draft.fields.destinationName}` : "",
        draft.fields.paymentMethod ? `method: ${draft.fields.paymentMethod}` : ""
      ].filter(Boolean);

      await addTransactions(
        selectedLines.map((line) => ({
          billingCycleId: currentCycle.id,
          title: line.title.trim(),
          date: draft.date || new Date().toISOString().slice(0, 10),
          amount: Number(line.amount),
          payerUserId: draft.payerUserId,
          transactionType: draft.transactionType,
          splitType: draft.transactionType === "food" ? "no_split" : draft.splitType,
          categoryId: resolveCategoryId(categories, line.categoryId || "other"),
          note: [line.note.trim(), line.quantity ? `qty: ${line.quantity}` : "", ...sharedNotes].filter(Boolean).join(" | ") || null,
          attachmentUrl
        }))
      );

      setSuccess(copy.saveSuccess);
      setDraft(null);
      setSelectedFile(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const selectedTotal =
    draft?.lines.reduce((sum, line) => {
      if (!line.include) return sum;
      const amount = Number(line.amount);
      return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
    }, 0) ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <Card className="space-y-5">
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/20">
          <Camera className="h-12 w-12 text-teal-600 dark:text-teal-300" />
          <h1 className="mt-4 text-2xl font-black">{copy.uploadTitle}</h1>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{copy.uploadSubtitle}</p>
          <label className="mt-6">
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <span className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-500 px-5 font-semibold text-slate-950 shadow-lg shadow-teal-500/20">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {copy.uploadImage}
            </span>
          </label>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.uploadHint}</p>
          {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
          {success ? <p className="mt-4 text-sm text-teal-600 dark:text-teal-300">{success}</p> : null}
        </div>

        {previewUrl ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
            <img src={previewUrl} alt="Scanned document preview" className="max-h-[34rem] w-full object-contain" />
          </div>
        ) : null}

        {draft ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
              {draft.documentType === "receipt" ? copy.receipt : copy.transfer}
            </div>
            <p className="mt-2">{copy.fillMissing}</p>
            <p className="mt-1">{copy.autoSplitHint}</p>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{copy.reviewTitle}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.detectedLines}</p>
          </div>
          <ReceiptText className="h-5 w-5 text-teal-600 dark:text-teal-300" />
        </div>

        {!draft ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            {copy.noLines}
          </div>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleSave}>
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{copy.sharedTitle}</h3>
                <p className="text-sm font-semibold text-teal-600 dark:text-teal-300">
                  {copy.selectedTotal}: {formatTHB(selectedTotal)}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={copy.title}>
                  <Input value={draft.title} onChange={(event) => updateDraftField("title", event.target.value)} />
                </Field>
                <Field label={copy.documentType}>
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-white/10"
                    value={draft.documentType}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              documentType: event.target.value as ReceiptOcrDocumentType,
                              transactionType: event.target.value === "receipt" ? "food" : "normal"
                            }
                          : current
                      )
                    }
                  >
                    <option value="receipt">{copy.receipt}</option>
                    <option value="transfer">{copy.transfer}</option>
                  </select>
                </Field>
                <Field label="Date">
                  <Input type="date" value={draft.date} onChange={(event) => updateDraftField("date", event.target.value)} />
                </Field>
                <Field label="Payer">
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-white/10"
                    value={draft.payerUserId}
                    onChange={(event) => updateDraftField("payerUserId", event.target.value)}
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Transaction type">
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-white/10"
                    value={draft.transactionType}
                    onChange={(event) => updateDraftField("transactionType", event.target.value)}
                  >
                    {transactionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label[locale]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Split">
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-white/10"
                    value={draft.splitType}
                    onChange={(event) => updateDraftField("splitType", event.target.value)}
                  >
                    {splitTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label[locale]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-bold">{copy.extractedTitle}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {fieldOrder.map((key) => (
                  <Field key={key} label={fieldLabel(key, copy)}>
                    <Input
                      placeholder={fieldLabel(key, copy)}
                      value={draft.fields[key] ?? ""}
                      onChange={(event) => updateExtractedField(key, event.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{copy.lineItemsTitle}</h3>
                <Button type="button" variant="secondary" onClick={addLine}>
                  <Plus className="h-4 w-4" />
                  {copy.addRow}
                </Button>
              </div>

              <div className="space-y-4">
                {draft.lines.map((line, index) => (
                  <div key={line.id} className="rounded-3xl border border-slate-200 p-4 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={line.include}
                          onChange={(event) => updateLine(line.id, { include: event.target.checked })}
                        />
                        {copy.includeRow} #{index + 1}
                      </label>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(line.id)} disabled={draft.lines.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_0.7fr_0.9fr]">
                      <Field label="Title">
                        <Input value={line.title} onChange={(event) => updateLine(line.id, { title: event.target.value })} />
                      </Field>
                      <Field label="Amount">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.amount}
                          onChange={(event) => updateLine(line.id, { amount: event.target.value })}
                        />
                      </Field>
                      <Field label="Category">
                        <select
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-white/10"
                          value={line.categoryId}
                          onChange={(event) => updateLine(line.id, { categoryId: event.target.value })}
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {getCategoryLabel(locale, category.id)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                      <Field label={copy.quantity}>
                        <Input value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
                      </Field>
                      <Field label={copy.lineNote}>
                        <Input value={line.note} onChange={(event) => updateLine(line.id, { note: event.target.value })} />
                      </Field>
                    </div>

                    <Field label={copy.sourceLine}>
                      <Input value={line.sourceLine} onChange={(event) => updateLine(line.id, { sourceLine: event.target.value })} />
                    </Field>
                  </div>
                ))}
              </div>
            </section>

            {draft.rawText ? (
              <section className="space-y-3">
                <h3 className="font-bold">{copy.rawTextTitle}</h3>
                <textarea
                  className="min-h-48 w-full rounded-3xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-100 outline-none dark:border-white/10"
                  value={draft.rawText}
                  onChange={(event) => setDraft((current) => (current ? { ...current, rawText: event.target.value } : current))}
                />
              </section>
            ) : null}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? copy.saving : copy.confirmSave}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
