"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/hooks/use-locale";
import { createClient } from "@/services/supabase/browser";
import type { Profile } from "@/types/domain";
import type { SummaryRow } from "./types";

function formatCycleLabel(locale: "th" | "en", startDate: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${startDate}T00:00:00`));
}

function formatBudgetValue(locale: "th" | "en", value: number) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
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
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);

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
        router.replace(`/auth/login?reauth=1&next=${encodeURIComponent("/settlement")}`);
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
    setEditingCycleId(null);
    await loadSummaries();
  }

  function startEditing(cycleId: string, currentBudget: number) {
    setError("");
    setMessage("");
    setBudgetDrafts((current) => ({
      ...current,
      [cycleId]: String(currentBudget)
    }));
    setEditingCycleId(cycleId);
  }

  function cancelEditing(cycleId: string, currentBudget: number) {
    setBudgetDrafts((current) => ({
      ...current,
      [cycleId]: String(currentBudget)
    }));
    setEditingCycleId((activeCycleId) => (activeCycleId === cycleId ? null : activeCycleId));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">{copy.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-teal-600 dark:text-teal-300">{message}</p> : null}

      <Card className="p-4">
        <div className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
          <p>{copy.cycleColumn}</p>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {summaries.length ? summaries.map((summary) => (
            <div key={summary.cycle.id} className="flex items-center justify-between gap-3 py-3">
              <Link href={`/settlement/${encodeURIComponent(summary.cycle.startDate)}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold transition hover:text-teal-600 dark:hover:text-teal-300">
                  {formatCycleLabel(locale, summary.cycle.startDate)}
                </p>
                <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 md:block">
                  {summary.cycle.startDate} - {summary.cycle.endDate}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {editingCycleId === summary.cycle.id ? (
                  <>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={budgetDrafts[summary.cycle.id] ?? ""}
                      onChange={(event) =>
                        setBudgetDrafts((current) => ({ ...current, [summary.cycle.id]: event.target.value }))
                      }
                      className="h-9 w-28 rounded-xl px-3 text-right text-sm"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => void saveBudget(summary.cycle.id)}
                      disabled={savingCycleId === summary.cycle.id}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => cancelEditing(summary.cycle.id, summary.cycle.foodBudgetTarget)}
                      disabled={savingCycleId === summary.cycle.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      {formatBudgetValue(locale, summary.cycle.foodBudgetTarget)}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={() => startEditing(summary.cycle.id, summary.cycle.foodBudgetTarget)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
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
