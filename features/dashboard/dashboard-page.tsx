"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, CalendarDays, ChevronDown, CreditCard, FileSpreadsheet, TrendingDown, Wallet, X } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SummaryRow } from "@/features/settlement/types";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n/dictionary";
import { calculateMonthlySettlement } from "@/services/settlement/calculate-monthly-settlement";
import { getCategoryLabel } from "@/utils/categories";
import { formatTHB } from "@/utils/currency";
import { formatShortDate } from "@/utils/date";

export function DashboardPage() {
  const { locale } = useLocale();
  const { currentCycle, installments, mode, transactions, users } = useFlowPayStore();
  const [chartsReady, setChartsReady] = useState(false);
  const [foodDetailsOpen, setFoodDetailsOpen] = useState(false);
  const [historicalSummaries, setHistoricalSummaries] = useState<SummaryRow[]>([]);

  const quickLinks =
    locale === "th"
      ? [
          {
            href: "/monthly-summary",
            title: "สรุปรายเดือน",
            description: "ดูภาพรวมย้อนหลังแยกตามรอบบิล",
            icon: CalendarDays
          },
          {
            href: "/import-history",
            title: "อัปโหลดข้อมูลเก่า",
            description: "นำเข้าข้อมูลย้อนหลังจากไฟล์ Excel",
            icon: FileSpreadsheet
          }
        ]
      : [
          {
            href: "/monthly-summary",
            title: "Monthly summary",
            description: "Review historical results by billing cycle",
            icon: CalendarDays
          },
          {
            href: "/import-history",
            title: "Import history",
            description: "Backfill older data from an Excel file",
            icon: FileSpreadsheet
          }
        ];

  useEffect(() => {
    setChartsReady(true);
  }, []);

  useEffect(() => {
    if (mode !== "production") return;

    let cancelled = false;

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

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const settlement = calculateMonthlySettlement({
    cycle: currentCycle,
    transactions,
    userIds: [users[0].id, users[1].id],
    today: new Date()
  });
  const finalTransfer = settlement.finalTransfer;
  const categoryData = [
    {
      name: getCategoryLabel(locale, "food"),
      value: transactions.filter((item) => item.transactionType === "food").reduce((sum, item) => sum + item.amount, 0),
      color: "#14b8a6"
    },
    {
      name: t(locale, "typeNormal"),
      value: transactions.filter((item) => item.transactionType === "normal").reduce((sum, item) => sum + item.amount, 0),
      color: "#8b5cf6"
    },
    {
      name: t(locale, "typeInstallment"),
      value: transactions.filter((item) => item.transactionType === "installment").reduce((sum, item) => sum + item.amount, 0),
      color: "#f97316"
    }
  ].filter((item) => item.value > 0);
  const trend = transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce<Array<{ day: string; amount: number }>>((items, transaction) => {
      const last = items.at(-1)?.amount ?? 0;
      items.push({ day: transaction.date.slice(-2), amount: last + transaction.amount });
      return items;
    }, []);
  const foodTransactions = transactions
    .filter((item) => item.transactionType === "food")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
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
  const copy =
    locale === "th"
      ? {
          monthlyExpenses: "ค่าใช้จ่ายรายเดือน",
          monthlyExpensesHint: "แยกค่าอาหารและค่าใช้จ่ายอื่นของแต่ละเดือน",
          monthlyFood: "ค่าอาหาร",
          monthlyOther: "ค่าอื่นๆ",
          foodExpenseList: "รายการอาหารที่รวมอยู่",
          foodExpenseHint: "กดที่การ์ดเพื่อเปิดหรือซ่อนรายการอาหารทั้งหมดของรอบนี้",
          itemDate: "วันที่",
          itemTitle: "รายการ",
          itemAmount: "ราคา",
          itemPayer: "คนจ่าย",
          paidAhead: "จ่ายก่อน",
          walletHolderPaid: "จ่ายจากกระเป๋าอาหาร",
          noFoodTransactions: "ยังไม่มีรายการอาหารในรอบนี้"
        }
      : {
          monthlyExpenses: "Monthly expenses",
          monthlyExpensesHint: "Food and other expenses split by month",
          monthlyFood: "Food",
          monthlyOther: "Other",
          foodExpenseList: "Included food transactions",
          foodExpenseHint: "Click the card to show or hide every food transaction in this cycle.",
          itemDate: "Date",
          itemTitle: "Item",
          itemAmount: "Amount",
          itemPayer: "Payer",
          paidAhead: "paid ahead",
          noFoodTransactions: "No food transactions in this cycle"
        };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden bg-slate-950 p-0 text-white dark:bg-white/[0.08]">
            <div className="relative p-6 sm:p-8">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl" />
              <Badge className="bg-teal-300/15 text-teal-200">{t(locale, "sharedFoodWallet")}</Badge>
              <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <p className="text-sm text-slate-300">{t(locale, "remainingBudget")}</p>
                  <h1 className="mt-2 text-4xl font-black tracking-normal sm:text-5xl">
                    {formatTHB(settlement.food.remaining)}
                  </h1>
                  <p className="mt-3 text-sm text-slate-300">
                    {t(locale, "walletHolder")}: {users.find((user) => user.id === currentCycle.foodWalletHolderUserId)?.displayName}
                    {" · "}
                    {formatShortDate(currentCycle.startDate)} - {formatShortDate(currentCycle.endDate)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-slate-300">{t(locale, "recommendedToday")}</p>
                  <p className="mt-1 text-2xl font-bold">{formatTHB(settlement.food.recommendedMaxDailySpending)}</p>
                  <p className="mt-1 text-xs text-slate-400">{settlement.food.remainingDays} {t(locale, "daysLeft")}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t(locale, "finalSettlement")}</p>
              <p className="text-xl font-bold">
                {finalTransfer
                  ? `${users.find((user) => user.id === finalTransfer.fromUserId)?.displayName} ${t(locale, "transfers")} ${users.find((user) => user.id === finalTransfer.toUserId)?.displayName}`
                  : t(locale, "allSettled")}
              </p>
            </div>
          </div>
          <p className="mt-6 text-4xl font-black">{formatTHB(finalTransfer?.amount ?? 0)}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t(locale, "settlementIncludes")}
          </p>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t(locale, "foodSpent"), value: formatTHB(settlement.food.spent), icon: TrendingDown, interactive: true },
          { label: t(locale, "carryOver"), value: formatTHB(settlement.food.carryOverToNextCycle), icon: Wallet },
          { label: t(locale, "nextContributionPerUser"), value: formatTHB(settlement.nextCycleContribution.perUserContribution), icon: CreditCard },
          { label: t(locale, "cycleDaysLeft"), value: settlement.food.remainingDays.toString(), icon: CalendarDays }
        ].map((item) => {
          const Icon = item.icon;
          if (item.interactive) {
            return (
              <button key={item.label} type="button" className="text-left" onClick={() => setFoodDetailsOpen((current) => !current)}>
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="h-5 w-5 text-teal-600 dark:text-teal-300" />
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition ${foodDetailsOpen ? "rotate-180" : ""}`} />
                  </div>
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold">{item.value}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.foodExpenseHint}</p>
                </Card>
              </button>
            );
          }

          return (
            <Card key={item.label}>
              <Icon className="h-5 w-5 text-teal-600 dark:text-teal-300" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-bold">{item.value}</p>
            </Card>
          );
        })}
      </section>

      {foodDetailsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setFoodDetailsOpen(false)}>
          <Card className="max-h-[85vh] w-full max-w-4xl overflow-hidden p-0" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold">{copy.foodExpenseList}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.foodExpenseHint}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{foodTransactions.length} {t(locale, "items")}</Badge>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setFoodDetailsOpen(false)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {foodTransactions.length ? (
              <div className="overflow-auto">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[92px_minmax(0,1fr)_110px_220px] gap-3 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <span>{copy.itemDate}</span>
                    <span>{copy.itemTitle}</span>
                    <span className="text-right">{copy.itemAmount}</span>
                    <span>{copy.itemPayer}</span>
                  </div>
                  {foodTransactions.map((transaction) => {
                    const payer = users.find((user) => user.id === transaction.payerUserId);
                    const paidAhead = transaction.payerUserId !== currentCycle.foodWalletHolderUserId;

                    return (
                      <div
                        key={transaction.id}
                        className="grid grid-cols-[92px_minmax(0,1fr)_110px_220px] gap-3 border-t border-slate-200 px-5 py-3 text-sm dark:border-white/10"
                      >
                        <span className="text-slate-500 dark:text-slate-400">{formatShortDate(transaction.date)}</span>
                        <span className="truncate font-semibold">{transaction.title}</span>
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
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{copy.noFoodTransactions}</p>
            )}
          </Card>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="block">
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{item.title}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>

      <section>
        <Card className="min-h-80 min-w-0">
          <div className="flex items-start justify-between gap-3">
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
          <div className="mt-4 h-64 min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenseData} barCategoryGap={24}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip
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

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="min-h-80 min-w-0">
          <h2 className="text-lg font-bold">{t(locale, "spendingTrend")}</h2>
          <div className="mt-4 h-56 min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatTHB(Number(value))} />
                  <Area type="monotone" dataKey="amount" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.18} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Card>

        <Card className="min-h-80 min-w-0">
          <h2 className="text-lg font-bold">{t(locale, "categoryMix")}</h2>
          <div className="mt-4 grid h-56 min-w-0 grid-cols-[0.9fr_1fr] items-center gap-2">
            <div className="h-full min-w-0">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" innerRadius={44} outerRadius={76} paddingAngle={4}>
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

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t(locale, "latestTransactions")}</h2>
            <Badge>{transactions.length} {t(locale, "items")}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                <div>
                  <p className="font-semibold">{transaction.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatShortDate(transaction.date)} · {transaction.transactionType}
                  </p>
                </div>
                <p className="font-bold">{formatTHB(transaction.amount)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="min-w-0">
          <h2 className="text-lg font-bold">{t(locale, "installmentOverview")}</h2>
          <div className="mt-5 h-48 min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={installments.map((item) => ({ name: item.title, done: item.currentInstallment, left: item.totalInstallments - item.currentInstallment }))}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="done" stackId="a" fill="#14b8a6" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="left" stackId="a" fill="#cbd5e1" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
