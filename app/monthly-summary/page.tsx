"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarRange, CreditCard, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";
import { createClient } from "@/services/supabase/browser";
import type { BillingCycle, Profile, SettlementResult } from "@/types/domain";
import { formatTHB } from "@/utils/currency";
import { formatShortDate } from "@/utils/date";

type SummaryRow = {
  cycle: BillingCycle;
  transactionCount: number;
  installmentCount: number;
  settlement: SettlementResult;
};

function monthlyCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        title: "สรุปรายเดือน",
        subtitle: "ดูภาพรวมแต่ละรอบบิลย้อนหลังจากข้อมูลจริงในระบบ",
        totalCycles: "จำนวนรอบบิล",
        currentCarryOver: "ยอดยกไปล่าสุด",
        activeInstallments: "ผ่อนชำระที่ยังไม่จบ",
        transactions: "รายการ",
        installments: "ผ่อน",
        finalTransfer: "ยอดโอนสุทธิ",
        noTransfer: "หักลบแล้วพอดี",
        foodSpent: "ค่าอาหารใช้ไป",
        remaining: "คงเหลือ",
        noData: "ยังไม่มีข้อมูลสรุปรายเดือน"
      }
    : {
        title: "Monthly summary",
        subtitle: "Review historical cycle summaries from production data.",
        totalCycles: "Billing cycles",
        currentCarryOver: "Latest carry over",
        activeInstallments: "Active installments",
        transactions: "transactions",
        installments: "installments",
        finalTransfer: "Final transfer",
        noTransfer: "Balanced after offset",
        foodSpent: "Food spent",
        remaining: "Remaining",
        noData: "No monthly summary data yet"
      };
}

export default function MonthlySummaryPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = monthlyCopy(locale);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [activeInstallments, setActiveInstallments] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const response = await fetch("/api/monthly-summary");
      const payload = (await response.json()) as {
        profiles?: Profile[];
        summaries?: SummaryRow[];
        activeInstallments?: number;
      };

      if (!response.ok) {
        if (response.status === 401) {
          router.replace(`/unlock?reauth=1&next=${encodeURIComponent("/monthly-summary")}`);
        }
        return;
      }

      if (!cancelled && response.ok) {
        setProfiles(payload.profiles ?? []);
        setSummaries(payload.summaries ?? []);
        setActiveInstallments(payload.activeInstallments ?? 0);
      }
    }

    void load();

    const channel = supabase
      .channel("monthly-summary-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "billing_cycles" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "installments" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [router]);

  const latestCarryOver = useMemo(() => summaries[0]?.settlement.food.carryOverToNextCycle ?? 0, [summaries]);
  const userNameById = (userId: string) => profiles.find((profile) => profile.id === userId)?.displayName ?? "Unknown";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">{copy.title}</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: copy.totalCycles, value: summaries.length.toString(), icon: CalendarRange },
          { label: copy.currentCarryOver, value: formatTHB(latestCarryOver), icon: Wallet },
          { label: copy.activeInstallments, value: activeInstallments.toString(), icon: CreditCard }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <Icon className="h-5 w-5 text-teal-600 dark:text-teal-300" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-bold">{item.value}</p>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-4">
        {summaries.length ? (
          summaries.map((summary) => (
            <Card key={summary.cycle.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <BarChart3 className="h-4 w-4" />
                    {formatShortDate(summary.cycle.startDate)} - {formatShortDate(summary.cycle.endDate)}
                  </div>
                  <p className="mt-2 text-2xl font-black">
                    {summary.transactionCount} {copy.transactions} / {summary.installmentCount} {copy.installments}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {copy.foodSpent}: {formatTHB(summary.settlement.food.spent)} / {copy.remaining}: {formatTHB(summary.settlement.food.remaining)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-right dark:bg-white/5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{copy.finalTransfer}</p>
                  {summary.settlement.finalTransfer ? (
                    <>
                      <p className="mt-2 text-2xl font-black">{formatTHB(summary.settlement.finalTransfer.amount)}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {userNameById(summary.settlement.finalTransfer.fromUserId)} {"->"} {userNameById(summary.settlement.finalTransfer.toUserId)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-lg font-bold">{copy.noTransfer}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-slate-500 dark:text-slate-400">{copy.noData}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
