"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";
import { t, type DictionaryKey } from "@/i18n/dictionary";
import type { Profile } from "@/types/domain";
import { getCategoryLabel } from "@/utils/categories";
import { cn } from "@/utils/cn";
import { formatTHB } from "@/utils/currency";
import type { DetailedLedgerLine, SummaryRow } from "./types";

function groupLedgerByDirection(lines: DetailedLedgerLine[], fromUserId: string, toUserId: string) {
  return lines.filter((line) => line.fromUserId === fromUserId && line.toUserId === toUserId);
}

function translateReason(locale: "th" | "en", reason: string) {
  const reasonKeyMap: Record<string, DictionaryKey> = {
    "Food paid by non-holder": "reasonFoodPaidByNonHolder",
    "Food budget overrun": "reasonFoodBudgetOverrun",
    "Shared installment": "reasonSharedInstallment",
    "Shared expense": "reasonSharedExpense",
    "Full reimbursement": "reasonFullReimbursement",
    "Next cycle food contribution": "reasonNextCycleFoodContribution"
  };

  return t(locale, reasonKeyMap[reason] ?? "settlementLedger");
}

function formatCycleLabel(locale: "th" | "en", startDate: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${startDate}T00:00:00`));
}

function formatDetailDate(locale: "th" | "en", date?: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "numeric",
    month: "short"
  }).format(new Date(`${date}T00:00:00`));
}

function getLedgerTitle(locale: "th" | "en", line: DetailedLedgerLine) {
  return line.transactionId ? line.title : translateReason(locale, line.reason);
}

function getLedgerMeta(locale: "th" | "en", line: DetailedLedgerLine) {
  if (!line.transactionId) return "";

  const categoryLabel =
    line.categoryId && (getCategoryLabel(locale, line.categoryId) !== getCategoryLabel(locale, "other") || line.categoryId === "other")
      ? getCategoryLabel(locale, line.categoryId)
      : line.categoryName ?? "";

  return [translateReason(locale, line.reason), categoryLabel, formatDetailDate(locale, line.date)].filter(Boolean).join(" • ");
}

function detailCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        back: "กลับไปหน้ารวม",
        loadFailed: "โหลดรายละเอียดสรุปยอดไม่สำเร็จ",
        notFound: "ไม่พบรอบบิลนี้",
        loading: "กำลังโหลด...",
        transferResult: "หลังหักลบ"
      }
    : {
        back: "Back to settlements",
        loadFailed: "Failed to load settlement detail",
        notFound: "Cycle not found",
        loading: "Loading...",
        transferResult: "After offset"
      };
}

function LedgerList({
  locale,
  title,
  total,
  lines
}: {
  locale: "th" | "en";
  title: string;
  total: number;
  lines: DetailedLedgerLine[];
}) {
  return (
    <Card className="p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-black">{formatTHB(total)}</p>
        </div>
        <Badge>{lines.length}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {lines.length ? (
          lines.map((line, index) => {
            const meta = getLedgerMeta(locale, line);

            return (
              <div
                key={`${line.transactionId ?? `${line.reason}-${index}`}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{getLedgerTitle(locale, line)}</p>
                  {meta ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</p> : null}
                </div>
                <p className="text-base font-black">{formatTHB(line.amount)}</p>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">
            {t(locale, "noItems")}
          </div>
        )}
      </div>
    </Card>
  );
}

export function SettlementDetailPage({ cycleStart }: { cycleStart: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = detailCopy(locale);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    void fetch(`/api/monthly-summary?cycleStart=${encodeURIComponent(cycleStart)}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          profiles?: Profile[];
          summaries?: SummaryRow[];
          error?: string;
        };

        if (!response.ok) {
          if (response.status === 401) {
            router.replace(`/unlock?reauth=1&next=${encodeURIComponent(`/settlement/${cycleStart}`)}`);
            return;
          }
          throw new Error(payload.error ?? copy.loadFailed);
        }

        setProfiles(payload.profiles ?? []);
        setSummary(payload.summaries?.[0] ?? null);
      })
      .catch((fetchError: unknown) => {
        setError(fetchError instanceof Error ? fetchError.message : copy.loadFailed);
      })
      .finally(() => setLoading(false));
  }, [copy.loadFailed, cycleStart, router]);

  const selectedSummary = useMemo(() => summary, [summary]);

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{copy.loading}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!selectedSummary) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{copy.notFound}</p>;
  }

  const settlement = selectedSummary.settlement;
  const userA = profiles[0];
  const userB = profiles[1];
  const aToBItems = userA && userB ? groupLedgerByDirection(selectedSummary.detailedLedger, userA.id, userB.id) : [];
  const bToAItems = userA && userB ? groupLedgerByDirection(selectedSummary.detailedLedger, userB.id, userA.id) : [];
  const aToBTotal = userA && userB ? settlement.grossByDirection[`${userA.id}->${userB.id}`] ?? 0 : 0;
  const bToATotal = userA && userB ? settlement.grossByDirection[`${userB.id}->${userA.id}`] ?? 0 : 0;
  const finalTransfer = settlement.finalTransfer;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/settlement"
            className={cn(
              "-ml-3 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition active:scale-[0.98]",
              "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
          <h1 className="mt-2 text-3xl font-black">{formatCycleLabel(locale, selectedSummary.cycle.startDate)}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {selectedSummary.cycle.startDate} - {selectedSummary.cycle.endDate}
          </p>
        </div>
        <Badge>{formatTHB(selectedSummary.cycle.foodBudgetTarget)}</Badge>
      </div>

      <Card className="space-y-4 bg-slate-950 p-4 text-white dark:bg-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-300/15 text-teal-200">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <Badge className="bg-white/10 text-white">{t(locale, "monthlySettlement")}</Badge>
            <h2 className="mt-1 text-2xl font-black">{t(locale, "netTransfer")}</h2>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs text-slate-300">
              {userA?.displayName} {t(locale, "givesTo")} {userB?.displayName}
            </p>
            <p className="mt-1 text-2xl font-black">{formatTHB(aToBTotal)}</p>
          </div>

          {finalTransfer ? (
            <div className="rounded-2xl bg-teal-300/10 px-4 py-3 text-center">
              <p className="text-xs text-teal-200">{copy.transferResult}</p>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold">
                <span>{profiles.find((user) => user.id === finalTransfer.fromUserId)?.displayName}</span>
                <ArrowRight className="h-4 w-4 text-teal-300" />
                <span>{profiles.find((user) => user.id === finalTransfer.toUserId)?.displayName}</span>
              </div>
              <p className="mt-1 text-3xl font-black">{formatTHB(finalTransfer.amount)}</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-teal-300/10 px-4 py-3 text-center text-xl font-black">{t(locale, "allSettled")}</div>
          )}

          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs text-slate-300">
              {userB?.displayName} {t(locale, "givesTo")} {userA?.displayName}
            </p>
            <p className="mt-1 text-2xl font-black">{formatTHB(bToATotal)}</p>
          </div>
        </div>
      </Card>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(locale, "budgetAvailable")}</p>
          <p className="mt-1 text-xl font-black">{formatTHB(settlement.food.budgetAvailable)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(locale, "foodRemaining")}</p>
          <p className="mt-1 text-xl font-black">{formatTHB(settlement.food.remaining)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(locale, "nextContributionPerUser")}</p>
          <p className="mt-1 text-xl font-black">{formatTHB(settlement.nextCycleContribution.perUserContribution)}</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <LedgerList
          locale={locale}
          title={`${userA?.displayName} ${t(locale, "givesTo")} ${userB?.displayName}`}
          total={aToBTotal}
          lines={aToBItems}
        />
        <LedgerList
          locale={locale}
          title={`${userB?.displayName} ${t(locale, "givesTo")} ${userA?.displayName}`}
          total={bToATotal}
          lines={bToAItems}
        />
      </section>
    </div>
  );
}
