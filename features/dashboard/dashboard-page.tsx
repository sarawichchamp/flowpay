"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, CalendarDays, CreditCard, FileSpreadsheet, TrendingDown, Wallet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n/dictionary";
import { calculateMonthlySettlement } from "@/services/settlement/calculate-monthly-settlement";
import { getCategoryLabel } from "@/utils/categories";
import { formatTHB } from "@/utils/currency";
import { formatShortDate } from "@/utils/date";

export function DashboardPage() {
  const { locale } = useLocale();
  const { currentCycle, installments, transactions, users } = useFlowPayStore();
  const [chartsReady, setChartsReady] = useState(false);

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
          { label: t(locale, "foodSpent"), value: formatTHB(settlement.food.spent), icon: TrendingDown },
          { label: t(locale, "carryOver"), value: formatTHB(settlement.food.carryOverToNextCycle), icon: Wallet },
          { label: t(locale, "nextContributionPerUser"), value: formatTHB(settlement.nextCycleContribution.perUserContribution), icon: CreditCard },
          { label: t(locale, "cycleDaysLeft"), value: settlement.food.remainingDays.toString(), icon: CalendarDays }
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
