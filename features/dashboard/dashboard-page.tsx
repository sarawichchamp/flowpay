"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, TrendingDown, Wallet, X } from "lucide-react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SummaryRow } from "@/features/settlement/types";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n/dictionary";
import { calculateMonthlySettlement } from "@/services/settlement/calculate-monthly-settlement";
import { createClient } from "@/services/supabase/browser";
import { generateInstallmentTransactions } from "@/services/installments/generate-installment-transactions";
import { getCategoryLabel } from "@/utils/categories";
import { formatTHB, roundMoney } from "@/utils/currency";
import { formatShortDate } from "@/utils/date";
import { formatInstallmentProgressLabel, parseInstallmentProgress } from "@/utils/installments";

function toLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DashboardPage() {
  const { locale } = useLocale();
  const { currentCycle, installments, mode, transactions, users } = useFlowPayStore();
  const [chartsReady, setChartsReady] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState<"food" | "other" | "installment" | null>(null);
  const [historicalSummaries, setHistoricalSummaries] = useState<SummaryRow[]>([]);

  const monthlySummaryLink =
    locale === "th"
      ? {
          href: "/monthly-summary",
          title: "สรุปรายเดือน",
          description: "ดูภาพรวมย้อนหลังแยกตามแต่ละรอบบิล",
          icon: CalendarDays
        }
      : {
          href: "/monthly-summary",
          title: "Monthly summary",
          description: "Review historical results by billing cycle",
          icon: CalendarDays
        };

  useEffect(() => {
    setChartsReady(true);
  }, []);

  useEffect(() => {
    if (!detailsModalType) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [detailsModalType]);

  useEffect(() => {
    if (mode !== "production") return;

    let cancelled = false;
    const supabase = createClient();

    async function loadHistoricalSummaries() {
      const response = await fetch("/api/monthly-summary");
      const payload = (await response.json()) as {
        summaries?: SummaryRow[];
      };

      if (!cancelled && response.ok) {
        setHistoricalSummaries(payload.summaries ?? []);
      }
    }

    void loadHistoricalSummaries();

    const channel = supabase
      .channel("dashboard-monthly-summary")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => void loadHistoricalSummaries())
      .on("postgres_changes", { event: "*", schema: "public", table: "billing_cycles" }, () => void loadHistoricalSummaries())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [mode]);

  const settlement = calculateMonthlySettlement({
    cycle: currentCycle,
    transactions,
    userIds: [users[0].id, users[1].id],
    today: new Date()
  });

  const foodTransactions = useMemo(
    () =>
      transactions
        .filter((item) => item.transactionType === "food")
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [transactions]
  );

  const otherTransactions = useMemo(
    () =>
      transactions
        .filter((item) => item.transactionType === "normal")
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [transactions]
  );

  const installmentTransactions = useMemo(() => {
    const actualTransactions = transactions.filter((item) => item.transactionType === "installment");
    const existingInstallmentIds = new Set(actualTransactions.map((item) => item.installmentId).filter((value): value is string => Boolean(value)));
    const projectedTransactions = installments
      .flatMap((installment) => generateInstallmentTransactions(installment, [currentCycle], "other"))
      .filter((item) => item.billingCycleId === currentCycle.id && item.installmentId && !existingInstallmentIds.has(item.installmentId))
      .map((item, index) => ({
        id: `projected-${item.installmentId}-${item.installmentNumber}-${index}`,
        billingCycleId: item.billingCycleId,
        date: item.date,
        title: item.title,
        categoryId: item.categoryId,
        amount: item.amount,
        payerUserId: item.payerUserId,
        transactionType: item.transactionType,
        splitType: item.splitType,
        note: item.note,
        attachmentUrl: item.attachmentUrl,
        createdAt: `${item.date}T00:00:00.000Z`,
        installmentId: item.installmentId
      }));

    return [...actualTransactions, ...projectedTransactions].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    );
  }, [currentCycle, installments, transactions]);

  const otherExpenseTotal = useMemo(
    () => otherTransactions.reduce((sum, item) => sum + item.amount, 0),
    [otherTransactions]
  );

  const installmentTotal = useMemo(
    () => installmentTransactions.reduce((sum, item) => sum + item.amount, 0),
    [installmentTransactions]
  );

  const categoryData = useMemo(
    () =>
      [
        {
          name: getCategoryLabel(locale, "food"),
          value: foodTransactions.reduce((sum, item) => sum + item.amount, 0),
          color: "#14b8a6"
        },
        {
          name: t(locale, "typeNormal"),
          value: transactions.filter((item) => item.transactionType === "normal").reduce((sum, item) => sum + item.amount, 0),
          color: "#0f766e"
        },
        {
          name: t(locale, "typeInstallment"),
          value: transactions.filter((item) => item.transactionType === "installment").reduce((sum, item) => sum + item.amount, 0),
          color: "#cbd5e1"
        }
      ].filter((item) => item.value > 0),
    [foodTransactions, locale, transactions]
  );

  const dailyFoodQuota = settlement.food.recommendedMaxDailySpending;
  const todayDateKey = toLocalDateKey(new Date());

  const dailyFoodData = useMemo(() => {
    const foodByDate = new Map<string, number>();

    for (const transaction of foodTransactions) {
      foodByDate.set(transaction.date, roundMoney((foodByDate.get(transaction.date) ?? 0) + transaction.amount));
    }

    return eachDayOfInterval({
      start: parseISO(currentCycle.startDate),
      end: parseISO(currentCycle.endDate)
    }).map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const spent = foodByDate.get(dateKey) ?? 0;

      return {
        dateKey,
        day: format(day, locale === "th" ? "d MMM" : "MMM d"),
        quota: dailyFoodQuota,
        spent,
        delta: roundMoney(spent - dailyFoodQuota),
        average: settlement.food.averageDailySpending
      };
    });
  }, [currentCycle.endDate, currentCycle.startDate, dailyFoodQuota, foodTransactions, locale, settlement.food.averageDailySpending]);

  const todayFoodSpent = dailyFoodData.find((item) => item.dateKey === todayDateKey)?.spent ?? 0;
  const todayFoodDelta = roundMoney(todayFoodSpent - dailyFoodQuota);

  const monthlyExpenseDataFromTransactions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
      month: "short",
      year: "2-digit"
    });
    const grouped = new Map<string, { month: string; food: number; other: number }>();

    transactions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      .forEach((transaction) => {
        const monthKey = transaction.date.slice(0, 7);
        const existing = grouped.get(monthKey);

        if (existing) {
          if (transaction.transactionType === "food") {
            existing.food += transaction.amount;
          } else {
            existing.other += transaction.amount;
          }
          return;
        }

        grouped.set(monthKey, {
          month: formatter.format(new Date(`${monthKey}-01T00:00:00`)),
          food: transaction.transactionType === "food" ? transaction.amount : 0,
          other: transaction.transactionType === "food" ? 0 : transaction.amount
        });
      });

    return Array.from(grouped.values());
  }, [locale, transactions]);

  const monthlyExpenseData = useMemo(() => {
    if (mode === "production" && historicalSummaries.length) {
      const formatter = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
        month: "short",
        year: "2-digit"
      });

      return historicalSummaries
        .slice()
        .sort((a, b) => a.cycle.startDate.localeCompare(b.cycle.startDate))
        .map((summary) => ({
          month: formatter.format(new Date(`${summary.cycle.startDate}T00:00:00`)),
          food: summary.expenseBreakdown.food,
          other: summary.expenseBreakdown.other
        }));
    }

    return monthlyExpenseDataFromTransactions;
  }, [historicalSummaries, locale, mode, monthlyExpenseDataFromTransactions]);

  const dailyChartPeak = useMemo(
    () =>
      Math.max(
        1,
        ...dailyFoodData.map((item) => Math.max(item.spent, item.quota, item.average))
      ),
    [dailyFoodData]
  );
  const dailyChartDomainMax = Math.max(Math.ceil(dailyChartPeak * 1.15), 1);

  const copy =
    locale === "th"
      ? {
          foodSpentLabel: "ค่าอาหารกินไปแล้ว",
          otherSpentLabel: "ค่าใช้จ่ายอื่นๆ รวมแล้ว",
          todayFoodLabel: "วันนี้กินไปแล้ว",
          todayQuotaLabel: "โควต้าอาหารวันนี้",
          averageDailyFoodLabel: "เฉลี่ยค่าอาหารต่อวัน",
          foodExpenseList: "รายการค่าอาหารรอบนี้",
          foodExpenseHint: "กดการ์ดเพื่อดูรายการค่าอาหารทั้งหมดของรอบนี้",
          foodTotal: "ยอดรวมค่าอาหารรอบนี้",
          itemDate: "วันที่",
          itemTitle: "รายการ",
          itemAmount: "ราคา",
          itemPayer: "คนจ่าย",
          paidAhead: "จ่ายก่อน",
          noFoodTransactions: "ยังไม่มีรายการอาหารในรอบนี้",
          dailyQuotaChart: "กราฟสรุปทั้งเดือน",
          dailyQuotaHint: "เทียบโควต้าต่อวันกับค่าอาหารที่ใช้จริง เพื่อดูว่าวันไหนกินต่ำหรือเกินงบ",
          dailySpentSeries: "ใช้จริง",
          dailyQuotaSeries: "เส้นโควต้า",
          dailyAverageSeries: "เส้นเฉลี่ยค่ากิน",
          overBudget: "เกินโควต้า",
          underBudget: "ต่ำกว่าโควต้า",
          monthlyExpenses: "ค่าใช้จ่ายรายเดือน",
          monthlyExpensesHint: "แยกค่าอาหารและค่าใช้จ่ายอื่นของแต่ละเดือน",
          monthlyFood: "ค่าอาหาร",
          monthlyOther: "ค่าใช้จ่ายอื่น",
          categoryMixTitle: "สัดส่วนค่าใช้จ่าย",
          latestTransactions: "รายการล่าสุด"
        }
      : {
          foodSpentLabel: "Food spent this cycle",
          otherSpentLabel: "Other expenses total",
          todayFoodLabel: "Food spent today",
          todayQuotaLabel: "Today's food quota",
          averageDailyFoodLabel: "Average food spending per day",
          foodExpenseList: "Food transactions this cycle",
          foodExpenseHint: "Tap the card to see all food transactions in this cycle.",
          foodTotal: "Total food spending this cycle",
          itemDate: "Date",
          itemTitle: "Item",
          itemAmount: "Amount",
          itemPayer: "Payer",
          paidAhead: "paid ahead",
          noFoodTransactions: "No food transactions in this cycle",
          dailyQuotaChart: "Monthly summary chart",
          dailyQuotaHint: "Compare each day's food quota with actual spending to spot days that run under or over budget.",
          dailySpentSeries: "Spent",
          dailyQuotaSeries: "Quota line",
          dailyAverageSeries: "Food average line",
          overBudget: "Over quota",
          underBudget: "Under quota",
          monthlyExpenses: "Monthly expenses",
          monthlyExpensesHint: "Food and other expenses split by month",
          monthlyFood: "Food",
          monthlyOther: "Other",
          categoryMixTitle: "Category mix",
          latestTransactions: "Latest transactions"
        };

  const MonthlySummaryIcon = monthlySummaryLink.icon;
  const otherExpenseListTitle = locale === "th" ? "รายการค่าใช้จ่ายอื่นรอบนี้" : "Other transactions this cycle";
  const otherExpenseHint = locale === "th" ? "กดการ์ดเพื่อดูรายการค่าใช้จ่ายอื่นทั้งหมดของรอบนี้" : "Tap the card to see all other transactions in this cycle.";
  const otherExpenseTotalLabel = locale === "th" ? "ยอดรวมค่าใช้จ่ายอื่นรอบนี้" : "Total other spending this cycle";
  const noOtherTransactions = locale === "th" ? "ยังไม่มีรายการค่าใช้จ่ายอื่นในรอบนี้" : "No other transactions in this cycle";
  const installmentCardLabel = locale === "th" ? "รายการผ่อนเดือนนี้" : "Installments this cycle";
  const installmentCardHint = locale === "th" ? "กดการ์ดเพื่อดูรายการผ่อนของรอบบิลนี้ทั้งหมด" : "Tap the card to see all installment items in this billing cycle.";
  const installmentListTitle = locale === "th" ? "รายการผ่อนรอบนี้" : "Installments this cycle";
  const installmentTotalLabel = locale === "th" ? "ยอดรวมผ่อนรอบนี้" : "Total installments this cycle";
  const noInstallmentTransactions = locale === "th" ? "ยังไม่มีรายการผ่อนในรอบนี้" : "No installments in this cycle";
  const summaryCards: Array<{
    label: string;
    value: string;
    icon: typeof TrendingDown;
    interactive?: "food" | "other" | "installment";
  }> = [
    { label: copy.foodSpentLabel, value: formatTHB(settlement.food.spent), icon: TrendingDown, interactive: "food" },
    { label: copy.otherSpentLabel, value: formatTHB(otherExpenseTotal), icon: Wallet, interactive: "other" },
    { label: installmentCardLabel, value: `${installmentTransactions.length} ${t(locale, "items")}`, icon: Wallet, interactive: "installment" },
    { label: copy.averageDailyFoodLabel, value: formatTHB(settlement.food.averageDailySpending), icon: CalendarDays }
  ];
  const detailTransactions =
    detailsModalType === "food"
      ? foodTransactions
      : detailsModalType === "other"
        ? otherTransactions
        : installmentTransactions;
  const detailTitle =
    detailsModalType === "food"
      ? copy.foodExpenseList
      : detailsModalType === "other"
        ? otherExpenseListTitle
        : installmentListTitle;
  const detailHint =
    detailsModalType === "food"
      ? copy.foodExpenseHint
      : detailsModalType === "other"
        ? otherExpenseHint
        : installmentCardHint;
  const detailTotalLabel =
    detailsModalType === "food"
      ? copy.foodTotal
      : detailsModalType === "other"
        ? otherExpenseTotalLabel
        : installmentTotalLabel;
  const detailTotalValue =
    detailsModalType === "food" ? settlement.food.spent : detailsModalType === "other" ? otherExpenseTotal : installmentTotal;
  const detailSummaryLabel = detailsModalType === "food" ? copy.averageDailyFoodLabel : null;
  const detailSummaryValue = detailsModalType === "food" ? settlement.food.averageDailySpending : null;
  const detailTransactionGroups = useMemo(() => {
    const grouped = new Map<string, typeof detailTransactions>();

    for (const transaction of detailTransactions) {
      const existing = grouped.get(transaction.date);
      if (existing) {
        existing.push(transaction);
        continue;
      }

      grouped.set(transaction.date, [transaction]);
    }

    return Array.from(grouped.entries()).map(([date, items]) => ({
      date,
      items,
      totalAmount: roundMoney(items.reduce((sum, transaction) => sum + transaction.amount, 0))
    }));
  }, [detailTransactions]);

  return (
    <div className="space-y-6">
      <section>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden bg-slate-950 p-0 text-white dark:bg-white/[0.08]">
            <div className="relative p-6 sm:p-8">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <Badge className="w-fit bg-teal-300/15 text-teal-200">{t(locale, "sharedFoodWallet")}</Badge>
                <div className="sm:text-right">
                  <p className="text-sm text-slate-300">{t(locale, "remainingBudget")}</p>
                  <h1 className="mt-2 text-4xl font-black tracking-normal sm:text-5xl">
                    {formatTHB(settlement.food.remaining)}
                  </h1>
                </div>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <p className="text-xs text-slate-400">
                    {users.find((user) => user.id === currentCycle.foodWalletHolderUserId)?.displayName}
                    {" · "}
                    {formatShortDate(currentCycle.startDate)} - {formatShortDate(currentCycle.endDate)}
                  </p>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:w-[220px] lg:grid-cols-1">
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300">{copy.todayQuotaLabel}</p>
                        <p className="mt-1 text-xl font-bold">{formatTHB(dailyFoodQuota)}</p>
                      </div>
                      <p className="shrink-0 pt-0.5 text-[11px] text-slate-400">{settlement.food.remainingDays} {t(locale, "daysLeft")}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300">{copy.todayFoodLabel}</p>
                        <p className="mt-1 text-xl font-bold">{formatTHB(todayFoodSpent)}</p>
                      </div>
                      <p className={`shrink-0 pt-0.5 text-[11px] ${todayFoodDelta > 0 ? "text-rose-200" : "text-emerald-200"}`}>
                        {todayFoodDelta > 0 ? copy.overBudget : copy.underBudget} {formatTHB(Math.abs(todayFoodDelta))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          const interactiveType = item.interactive;
          if (interactiveType) {
            return (
              <button key={item.label} type="button" className="min-w-0 text-left" onClick={() => setDetailsModalType((current) => (current === interactiveType ? null : interactiveType))}>
                <Card className="h-full min-w-0 p-4 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="h-5 w-5 text-teal-600 dark:text-teal-300" />
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition ${detailsModalType === interactiveType ? "rotate-180" : ""}`} />
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-1 text-xl font-bold sm:text-2xl">{item.value}</p>
                </Card>
              </button>
            );
          }

          return (
            <Card key={item.label} className="min-w-0 p-4 sm:p-5">
              <Icon className="h-5 w-5 text-teal-600 dark:text-teal-300" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1 text-xl font-bold sm:text-2xl">{item.value}</p>
            </Card>
          );
        })}
      </section>

      {detailsModalType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4" onClick={() => setDetailsModalType(null)}>
          <Card className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold">{detailTitle}</h2>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{detailTransactions.length} {t(locale, "items")}</Badge>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setDetailsModalType(null)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {detailTransactions.length ? (
              <div className="overflow-y-auto overscroll-contain">
                <div
                  className={`grid gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 ${
                    detailsModalType === "food" ? "sm:grid-cols-2" : "sm:grid-cols-1"
                  }`}
                >
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{detailTotalLabel}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{formatTHB(detailTotalValue)}</p>
                  </div>
                  {detailSummaryLabel && detailSummaryValue !== null ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{detailSummaryLabel}</p>
                      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{formatTHB(detailSummaryValue)}</p>
                    </div>
                  ) : null}
                </div>
                <div className="hidden md:block">
                  <div className="grid grid-cols-[92px_minmax(0,1fr)_110px_220px] gap-3 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <span>{copy.itemDate}</span>
                    <span>{copy.itemTitle}</span>
                    <span className="text-right">{copy.itemAmount}</span>
                    <span>{copy.itemPayer}</span>
                  </div>
                  {detailTransactions.map((transaction) => {
                    const payer = users.find((user) => user.id === transaction.payerUserId);
                    const paidAhead = detailsModalType === "food" && transaction.payerUserId !== currentCycle.foodWalletHolderUserId;
                    const installmentProgress = detailsModalType === "installment" ? parseInstallmentProgress(transaction.title) : null;

                    return (
                      <div
                        key={transaction.id}
                        className="grid grid-cols-[92px_minmax(0,1fr)_110px_220px] gap-3 border-t border-slate-200 px-5 py-3 text-sm dark:border-white/10"
                      >
                        <span className="text-slate-500 dark:text-slate-400">{formatShortDate(transaction.date)}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {installmentProgress ? installmentProgress.baseTitle : transaction.title}
                          </span>
                          {installmentProgress ? (
                            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                              {formatInstallmentProgressLabel(locale, transaction.title)}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-right font-bold">{formatTHB(transaction.amount)}</span>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{payer?.displayName ?? "-"}</span>
                          {paidAhead ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                              {(payer?.displayName ?? "-") + " " + copy.paidAhead}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2.5 p-3 md:hidden">
                  {detailTransactionGroups.map((group) => (
                    <div key={group.date} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-white/10">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{copy.itemDate}</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{formatShortDate(group.date)}</p>
                        </div>
                        <Badge>{group.items.length} {t(locale, "items")} · {formatTHB(group.totalAmount)}</Badge>
                      </div>

                      <div className="mt-2 space-y-2">
                        {group.items.map((transaction) => {
                          const payer = users.find((user) => user.id === transaction.payerUserId);
                          const paidAhead = detailsModalType === "food" && transaction.payerUserId !== currentCycle.foodWalletHolderUserId;
                          const installmentProgress = detailsModalType === "installment" ? parseInstallmentProgress(transaction.title) : null;

                          return (
                            <div key={transaction.id} className="rounded-2xl bg-white px-3 py-2.5 shadow-sm dark:bg-white/[0.04]">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="text-sm font-semibold text-slate-950 dark:text-white"
                                    style={{
                                      display: "-webkit-box",
                                      WebkitBoxOrient: "vertical",
                                      WebkitLineClamp: 2,
                                      overflow: "hidden"
                                    }}
                                  >
                                    {installmentProgress ? installmentProgress.baseTitle : transaction.title}
                                  </p>
                                  {installmentProgress ? (
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatInstallmentProgressLabel(locale, transaction.title)}</p>
                                  ) : null}
                                </div>
                                <p className="shrink-0 text-right text-base font-bold text-slate-950 dark:text-white">{formatTHB(transaction.amount)}</p>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                                <span>{payer?.displayName ?? "-"}</span>
                                {paidAhead ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                                    {(payer?.displayName ?? "-") + " " + copy.paidAhead}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                {detailsModalType === "food" ? copy.noFoodTransactions : detailsModalType === "other" ? noOtherTransactions : noInstallmentTransactions}
              </p>
            )}
          </Card>
        </div>
      ) : null}

      <section>
        <Card className="min-w-0 overflow-hidden p-0">
          <div className="border-b border-slate-200/80 px-5 py-5 dark:border-white/10 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{copy.dailyQuotaChart}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{copy.dailyQuotaHint}</p>
            </div>
          </div>

          <div className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
            <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.04] sm:p-4">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3 dark:border-white/10">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
                  <span className="h-0.5 w-5 rounded-full bg-slate-400" />
                  {copy.dailyQuotaSeries}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
                  <span className="h-0.5 w-5 rounded-full bg-teal-500" />
                  {copy.dailySpentSeries}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200">
                  <span className="h-0.5 w-5 rounded-full bg-cyan-500" />
                  {copy.dailyAverageSeries}
                </span>
              </div>

              <div className="mt-3 h-[170px] min-w-0 sm:h-[190px]">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyFoodData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} minTickGap={20} tickMargin={8} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        allowDataOverflow
                        domain={[0, dailyChartDomainMax]}
                        tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                        tickMargin={8}
                      />
                      <Tooltip
                        cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                        contentStyle={{
                          borderRadius: "18px",
                          border: "1px solid rgba(148, 163, 184, 0.2)",
                          background: "rgba(15, 23, 42, 0.92)",
                          color: "#f8fafc"
                        }}
                        formatter={(value, name, entry) => {
                          if (name === "quota") return [formatTHB(Number(value ?? 0)), copy.dailyQuotaSeries];
                          if (name === "average") return [formatTHB(Number(value ?? 0)), copy.dailyAverageSeries];
                          const delta = Number(entry?.payload?.delta ?? 0);
                          const deltaLabel = delta > 0 ? copy.overBudget : copy.underBudget;
                          return [`${formatTHB(Number(value ?? 0))} (${deltaLabel} ${formatTHB(Math.abs(delta))})`, copy.dailySpentSeries];
                        }}
                        labelFormatter={(label) => `${copy.dailyQuotaChart}: ${label}`}
                      />
                      <Line type="monotone" dataKey="spent" stroke="#14b8a6" strokeWidth={3.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} name="spent" />
                      <Line type="monotone" dataKey="quota" stroke="#94a3b8" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="quota" />
                      <Line type="monotone" dataKey="average" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="6 6" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="average" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <Link href={monthlySummaryLink.href} className="block">
          <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                <MonthlySummaryIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{monthlySummaryLink.title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{monthlySummaryLink.description}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Card className="min-w-0">
          <h2 className="text-lg font-bold">{copy.categoryMixTitle}</h2>
          <div className="mt-4 grid min-w-0 grid-cols-1 items-center gap-4 sm:h-56 sm:grid-cols-[0.9fr_1fr] sm:gap-2">
            <div className="h-56 min-w-0 pointer-events-none sm:h-full md:pointer-events-auto">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" innerRadius={44} outerRadius={76} paddingAngle={4} rootTabIndex={-1}>
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
            <div className="space-y-3">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <strong>{formatTHB(item.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section>
        <Card className="min-h-80 min-w-0 overflow-hidden">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
            <div>
              <h2 className="text-lg font-bold">{copy.monthlyExpenses}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.monthlyExpensesHint}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-teal-500" />
                {copy.monthlyFood}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-cyan-200" />
                {copy.monthlyOther}
              </span>
            </div>
          </div>
          <div className="mt-4 h-64 min-w-0 pointer-events-none md:pointer-events-auto">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenseData} barCategoryGap={24}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip
                    cursor={false}
                    formatter={(value, name) => [formatTHB(Number(value ?? 0)), name === "food" ? copy.monthlyFood : copy.monthlyOther]}
                    labelFormatter={(label) => `${copy.monthlyExpenses}: ${label}`}
                  />
                  <Bar dataKey="food" stackId="expenses" fill="#14b8a6" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="other" stackId="expenses" fill="#bae6fd" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Card>
      </section>

      <section>
        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{copy.latestTransactions}</h2>
            <Badge>{transactions.length} {t(locale, "items")}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {transactions
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
              .map((transaction) => (
              <div key={transaction.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <span className="shrink-0 text-slate-500 dark:text-slate-400">{formatShortDate(transaction.date)}</span>
                  <span className="truncate font-semibold">{transaction.title}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{transaction.transactionType}</span>
                </div>
                <p className="shrink-0 text-sm font-bold">{formatTHB(transaction.amount)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
