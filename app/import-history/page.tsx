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

function importCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        title: "อัปโหลดข้อมูลย้อนหลัง",
        subtitle: "ระบบจะตรวจไฟล์ก่อนเสมอ ถ้ามีแถวผิดจะหยุดและแจ้งรายการที่ต้องแก้ก่อนเขียนข้อมูลจริง",
        template: "ดาวน์โหลด Excel template",
        file: "ไฟล์ Excel",
        upload: "ตรวจและอัปโหลดข้อมูล",
        uploading: "กำลังตรวจไฟล์...",
        result: "ผลการนำเข้า",
        helper: "ใช้ไฟล์ .xlsx ที่มีชีต BillingCycles, Transactions และ Installments",
        importFailed: "นำเข้าข้อมูลไม่สำเร็จ",
        validationTitle: "รายการที่ต้องแก้ก่อนนำเข้า"
      }
    : {
        title: "Import historical data",
        subtitle: "The file is validated first. If any row is invalid, import stops and shows the errors before writing data.",
        template: "Download Excel template",
        file: "Excel file",
        upload: "Validate and upload",
        uploading: "Validating...",
        result: "Import result",
        helper: "Use a .xlsx file with BillingCycles, Transactions, and Installments sheets.",
        importFailed: "Import failed",
        validationTitle: "Fix these rows before importing"
      };
}

export default function ImportHistoryPage() {
  const { locale } = useLocale();
  const copy = importCopy(locale);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationIssue[]>([]);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult("");
    setValidationErrors([]);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/import-history", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json()) as {
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

    const skippedTotal =
      (payload.skippedCycles ?? 0) + (payload.skippedInstallments ?? 0) + (payload.skippedTransactions ?? 0);

    setResult(
      locale === "th"
        ? `รอบบิล ${payload.importedCycles ?? 0} / ผ่อนชำระ ${payload.importedInstallments ?? 0} / ธุรกรรม ${payload.importedTransactions ?? 0} / ข้ามซ้ำ ${skippedTotal}`
        : `Cycles ${payload.importedCycles ?? 0} / Installments ${payload.importedInstallments ?? 0} / Transactions ${payload.importedTransactions ?? 0} / Skipped ${skippedTotal}`
    );
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
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="mt-5">
          <Button type="button" onClick={() => void handleUpload()} disabled={!file || loading}>
            <Upload className="h-4 w-4" />
            {loading ? copy.uploading : copy.upload}
          </Button>
        </div>
        {result ? (
          <p className="mt-4 text-sm text-teal-600 dark:text-teal-300">
            {copy.result}: {result}
          </p>
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
