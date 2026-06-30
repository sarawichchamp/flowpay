"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { useLocale } from "@/hooks/use-locale";

type ValidationIssue = {
  sheet: "BillingCycles" | "Transactions" | "Installments";
  row: number;
  message: string;
};

type ImportPreview = {
  billingCycles: Array<{
    startDate: string;
    endDate: string;
    foodBudgetTarget: number;
    foodWalletHolderUserId: string;
    carryOverAmount: number;
  }>;
  installments: Array<{
    title: string;
    totalInstallments: number;
    currentInstallment: number;
    monthlyAmount: number;
    startDate: string;
    endDate: string;
    payerUserId: string;
    splitType: "split_half" | "no_split" | "full_reimburse";
  }>;
  transactions: Array<{
    cycleStartDate: string;
    date: string;
    title: string;
    categoryId: string;
    amount: number;
    payerUserId: string;
    transactionType: "food" | "normal" | "installment";
    splitType: "split_half" | "no_split" | "full_reimburse";
    note: string | null;
    installmentTitle: string | null;
    installmentNumber: number | null;
  }>;
  summary: {
    importedCycles: number;
    skippedCycles: number;
    importedInstallments: number;
    skippedInstallments: number;
    importedTransactions: number;
    skippedTransactions: number;
  };
};

function importCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        title: "อัปโหลดข้อมูลย้อนหลัง",
        subtitle: "ระบบจะตรวจไฟล์ก่อนเสมอ ถ้ามีแถวผิดจะหยุดและแจ้งรายการที่ต้องแก้ก่อนเขียนข้อมูลจริง",
        template: "ดาวน์โหลด Excel template",
        file: "ไฟล์ Excel",
        upload: "ดูตัวอย่างก่อนนำเข้า",
        uploading: "กำลังตรวจไฟล์...",
        confirmImport: "ยืนยันการนำเข้า",
        confirming: "กำลังนำเข้าจริง...",
        result: "ผลการนำเข้า",
        preview: "ตัวอย่างก่อนนำเข้า",
        helper: "ใช้ไฟล์ .xlsx ที่มีชีต BillingCycles, Transactions และ Installments",
        importFailed: "นำเข้าข้อมูลไม่สำเร็จ",
        validationTitle: "รายการที่ต้องแก้ก่อนนำเข้า",
        previewReady: "ตรวจไฟล์ผ่านแล้ว กรุณาตรวจจำนวนรายการก่อนยืนยันนำเข้าจริง"
      }
    : {
        title: "Import historical data",
        subtitle: "The file is validated first. If any row is invalid, import stops and shows the errors before writing data.",
        template: "Download Excel template",
        file: "Excel file",
        upload: "Preview import",
        uploading: "Validating...",
        confirmImport: "Confirm import",
        confirming: "Importing...",
        result: "Import result",
        preview: "Preview",
        helper: "Use a .xlsx file with BillingCycles, Transactions, and Installments sheets.",
        importFailed: "Import failed",
        validationTitle: "Fix these rows before importing",
        previewReady: "Validation passed. Review the counts below before confirming the actual import."
      };
}

function isImportSummary(value: unknown): value is ImportPreview["summary"] {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ImportPreview["summary"]>;

  return (
    typeof candidate.importedCycles === "number" &&
    typeof candidate.skippedCycles === "number" &&
    typeof candidate.importedInstallments === "number" &&
    typeof candidate.skippedInstallments === "number" &&
    typeof candidate.importedTransactions === "number" &&
    typeof candidate.skippedTransactions === "number"
  );
}

export default function ImportHistoryPage() {
  const { locale } = useLocale();
  const copy = importCopy(locale);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationIssue[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  function formatSummary(summary: ImportPreview["summary"]) {
    const skippedTotal = summary.skippedCycles + summary.skippedInstallments + summary.skippedTransactions;

    return locale === "th"
      ? `รอบบิล ${summary.importedCycles} / ผ่อนชำระ ${summary.importedInstallments} / ธุรกรรม ${summary.importedTransactions} / ข้ามซ้ำ ${skippedTotal}`
      : `Cycles ${summary.importedCycles} / Installments ${summary.importedInstallments} / Transactions ${summary.importedTransactions} / Skipped ${skippedTotal}`;
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult("");
    setValidationErrors([]);
    setPreview(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/import-history", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json()) as {
      preview?: ImportPreview;
      importedCycles?: number;
      skippedCycles?: number;
      importedInstallments?: number;
      skippedInstallments?: number;
      importedTransactions?: number;
      skippedTransactions?: number;
      error?: string;
      validationErrors?: ValidationIssue[];
    };

    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? copy.importFailed);
      setValidationErrors(payload.validationErrors ?? []);
      return;
    }

    if (payload.preview) {
      setPreview(payload.preview);
      setResult(formatSummary(payload.preview.summary));
    }
  }

  async function handleConfirmImport() {
    if (!preview) return;

    setConfirming(true);
    setError("");

    const response = await fetch("/api/import-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "commit",
        preview
      })
    });

    const payload = (await response.json()) as unknown;

    setConfirming(false);

    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload ? (payload as { error?: string }).error : null;
      setError(message ?? copy.importFailed);
      return;
    }

    if (!isImportSummary(payload)) {
      setError(copy.importFailed);
      return;
    }

    const summary = payload;
    setResult(formatSummary(summary));
    setPreview(null);
    setFile(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">{copy.title}</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{copy.template}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.helper}</p>
          </div>
        </div>
        <div className="mt-5">
          <Link
            href="/templates/flowpay-import-template.xlsx"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white dark:bg-white dark:text-slate-950"
          >
            <Download className="h-4 w-4" />
            {copy.template}
          </Link>
        </div>
      </Card>

      <Card>
        <Field label={copy.file}>
          <input
            type="file"
            accept=".xlsx"
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/10"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setResult("");
              setError("");
              setValidationErrors([]);
            }}
          />
        </Field>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void handlePreview()} disabled={!file || loading || confirming}>
            <Upload className="h-4 w-4" />
            {loading ? copy.uploading : copy.upload}
          </Button>
          {preview ? (
            <Button type="button" variant="secondary" onClick={() => void handleConfirmImport()} disabled={loading || confirming}>
              <Upload className="h-4 w-4" />
              {confirming ? copy.confirming : copy.confirmImport}
            </Button>
          ) : null}
        </div>
        {result ? (
          <p className="mt-4 text-sm text-teal-600 dark:text-teal-300">
            {copy.result}: {result}
          </p>
        ) : null}
        {preview ? (
          <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-500/20 dark:bg-teal-500/10">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-200">{copy.preview}</p>
            <p className="mt-2 text-sm text-teal-700 dark:text-teal-200">{copy.previewReady}</p>
          </div>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
        {validationErrors.length ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
            <p className="text-sm font-semibold text-red-600 dark:text-red-300">{copy.validationTitle}</p>
            <div className="mt-3 space-y-2 text-sm text-red-600 dark:text-red-300">
              {validationErrors.map((issue, index) => (
                <p key={`${issue.sheet}-${issue.row}-${index}`}>
                  {issue.sheet} row {issue.row}: {issue.message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
