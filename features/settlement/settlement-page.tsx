"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/hooks/use-locale";
import { createClient } from "@/services/supabase/browser";
import type { Profile } from "@/types/domain";
import { cn } from "@/utils/cn";
import type { SummaryRow } from "./types";

function formatCycleLabel(locale: "th" | "en", startDate: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${startDate}T00:00:00`));
}

function settlementCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        title: "สรุปยอด",
        subtitle: "เลือกเดือนก่อน แล้วค่อยกดเข้าไปดูรายละเอียดของรอบนั้น",
        cycleColumn: "Billing cycle",
        budgetColumn: "งบรวม",
        open: "ดูรายละเอียด",
        updated: "บันทึกงบรอบนี้แล้ว",
        loadFailed: "โหลดข้อมูลสรุปยอดไม่สำเร็จ",
        updateFailed: "อัปเดตงบรอบบิลไม่สำเร็จ",
        empty: "ยังไม่มีรอบบิล",
        loading: "กำลังโหลด..."
      }
    : {
        title: "Settlement",
        subtitle: "Start from month/year, then open a cycle to inspect the details.",
        cycleColumn: "Billing cycle",
        budgetColumn: "Budget",
        open: "Open",
        updated: "Budget updated",
        loadFailed: "Failed to load settlements",
        updateFailed: "Failed to update cycle budget",
        empty: "No billing cycles yet",
        loading: "Loading..."
      };
}

export function SettlementPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = settlementCopy(locale);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [, setProfiles] = useState<Profile[]>([]);
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingCycleId, setSavingCycleId] = useState<string | null>(null);

  async function loadSummaries() {
    setError("");
    const response = await fetch("/api/monthly-summary");
    const payload = (await response.json()) as {
      profiles?: Profile[];
      summaries?: SummaryRow[];
      error?: string;
    };

    if (!response.ok) {
      if (response.status === 401) {
        router.replace(`/unlock?reauth=1&next=${encodeURIComponent("/settlement")}`);
        return;
      }
      setError(payload.error ?? copy.loadFailed);
      return;
    }

    const nextSummaries = payload.summaries ?? [];
    setProfiles(payload.profiles ?? []);
    setSummaries(nextSummaries);
    setBudgetDrafts(
      Object.fromEntries(nextSummaries.map((summary) => [summary.cycle.id, String(summary.cycle.foodBudgetTarget)]))
    );
  }

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);
    void loadSummaries().finally(() => setLoading(false));

    const channel = supabase
      .channel("settlement-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => void loadSummaries())
      .on("postgres_changes", { event: "*", schema: "public", table: "billing_cycles" }, () => void loadSummaries())
      .on("postgres_changes", { event: "*", schema: "public", table: "installments" }, () => void loadSummaries())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function saveBudget(cycleId: string) {
    const parsedBudget = Number(budgetDrafts[cycleId]);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setError(copy.updateFailed);
      return;
    }

    setSavingCycleId(cycleId);
    setError("");
    setMessage("");

    const response = await fetch("/api/billing-cycles", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: cycleId,
        foodBudgetTarget: parsedBudget
      })
    });

    const payload = (await response.json()) as { error?: string };
    setSavingCycleId(null);

    if (!response.ok) {
      setError(payload.error ?? copy.updateFailed);
      return;
    }

    setMessage(copy.updated);
    await loadSummaries();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">{copy.title}</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-teal-600 dark:text-teal-300">{message}</p> : null}

      <Card>
        <div className="grid gap-3 border-b border-slate-200 pb-3 text-sm font-semibold dark:border-white/10 md:grid-cols-[minmax(0,1fr)_180px_150px]">
          <p>{copy.cycleColumn}</p>
          <p className="md:text-right">{copy.budgetColumn}</p>
          <p className="md:text-right">{copy.open}</p>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {summaries.length ? summaries.map((summary) => (
            <div key={summary.cycle.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_180px_150px] md:items-center">
              <div className="min-w-0">
                <p className="font-semibold">{formatCycleLabel(locale, summary.cycle.startDate)}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {summary.cycle.startDate} - {summary.cycle.endDate}
                </p>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetDrafts[summary.cycle.id] ?? ""}
                  onChange={(event) => setBudgetDrafts((current) => ({ ...current, [summary.cycle.id]: event.target.value }))}
                  className="text-right"
                />
                <Button type="button" size="icon" onClick={() => void saveBudget(summary.cycle.id)} disabled={savingCycleId === summary.cycle.id}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
              <div className="md:justify-self-end">
                <Link
                  href={`/settlement/${encodeURIComponent(summary.cycle.startDate)}`}
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition active:scale-[0.98]",
                    "bg-white/70 text-slate-950 ring-1 ring-slate-200 hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/10"
                  )}
                >
                  {copy.open}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )) : (
            <p className="py-4 text-sm text-slate-500 dark:text-slate-400">{loading ? copy.loading : copy.empty}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
