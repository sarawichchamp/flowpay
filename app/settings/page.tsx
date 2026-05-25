"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n/dictionary";

function settingsCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        summary: "หน้าสรุปยอด",
        importHistory: "หน้าอัปโหลดข้อมูลเก่า",
        summaryHint: "ตั้งงบของแต่ละรอบเดือนและกดเข้าไปดูรายละเอียดสรุปยอดได้จากหน้านี้",
        importHint: "ตรวจไฟล์ก่อนและนำเข้าข้อมูลย้อนหลังจาก Excel"
      }
    : {
        summary: "Settlement page",
        importHistory: "Historical import page",
        summaryHint: "Set each cycle budget and open that cycle for detailed settlement",
        importHint: "Validate and import historical Excel data"
      };
}

export default function SettingsPage() {
  const { locale } = useLocale();
  const copy = settingsCopy(locale);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">{t(locale, "settings")}</h1>

      <Card>
        <h2 className="text-xl font-bold">{t(locale, "household")}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{t(locale, "householdDescription")}</p>
      </Card>

      <Card>
        <div className="space-y-3">
          <Link href="/settlement" className="block rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <p className="font-semibold">{copy.summary}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.summaryHint}</p>
          </Link>
          <Link href="/import-history" className="block rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <p className="font-semibold">{copy.importHistory}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.importHint}</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
