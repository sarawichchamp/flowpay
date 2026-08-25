"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, Save, Scale, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/hooks/use-locale";
import { t, type DictionaryKey } from "@/i18n/dictionary";
import { createClient } from "@/services/supabase/browser";
import type { Profile, SplitType, Transaction, TransactionType } from "@/types/domain";
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

function editorCopy(locale: "th" | "en") {
  return locale === "th"
    ? { title: "รายการในสรุปยอดนี้", edit: "แก้ไข", cancel: "ยกเลิก", save: "บันทึกการแก้ไข", paidBy: "จ่ายโดย", type: "ประเภทรายการ", split: "การหาร", food: "อาหาร", normal: "ทั่วไป", splitHalf: "หารครึ่ง", noSplit: "ไม่หาร", fullReimburse: "คืนเต็มจำนวน", installmentLocked: "รายการผ่อนให้แก้ไขจากหน้าผ่อนชำระ", updateFailed: "แก้ไขรายการไม่สำเร็จ" }
    : { title: "Transactions in this summary", edit: "Edit", cancel: "Cancel", save: "Save changes", paidBy: "Paid by", type: "Transaction type", split: "Split", food: "Food", normal: "General", splitHalf: "Split half", noSplit: "No split", fullReimburse: "Full reimbursement", installmentLocked: "Edit installment entries from the Installments page", updateFailed: "Failed to update transaction" };
}

function getTransactionTypeLabel(locale: "th" | "en", transactionType: TransactionType) {
  if (transactionType === "food") return locale === "th" ? "ค่าอาหาร" : "Food";
  if (transactionType === "installment") return locale === "th" ? "ผ่อนชำระ" : "Installment";
  return locale === "th" ? "ค่าใช้จ่ายอื่น" : "Other expense";
}

function getSplitTypeLabel(locale: "th" | "en", splitType: SplitType) {
  if (splitType === "split_half") return locale === "th" ? "หารครึ่ง" : "Split half";
  if (splitType === "full_reimburse") return locale === "th" ? "คืนเต็มจำนวน" : "Full reimbursement";
  return locale === "th" ? "ไม่หาร" : "No split";
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
  const editCopy = editorCopy(locale);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", date: "", amount: "", payerUserId: "", transactionType: "normal" as TransactionType, splitType: "split_half" as SplitType });
  const [saving, setSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/monthly-summary?cycleStart=${encodeURIComponent(cycleStart)}`);
        const payload = (await response.json()) as {
          profiles?: Profile[];
          summaries?: SummaryRow[];
          error?: string;
        };

        if (!response.ok) {
          if (response.status === 401) {
            router.replace(`/auth/login?reauth=1&next=${encodeURIComponent(`/settlement/${cycleStart}`)}`);
            return;
          }
          throw new Error(payload.error ?? copy.loadFailed);
        }

        if (cancelled) return;
        setProfiles(payload.profiles ?? []);
        setSummary(payload.summaries?.[0] ?? null);
      } catch (fetchError: unknown) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : copy.loadFailed);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    const channel = supabase
      .channel(`settlement-detail:${cycleStart}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => void loadSummary())
      .on("postgres_changes", { event: "*", schema: "public", table: "billing_cycles" }, () => void loadSummary())
      .on("postgres_changes", { event: "*", schema: "public", table: "installments" }, () => void loadSummary())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [copy.loadFailed, cycleStart, refreshToken, router]);

  function startEditing(transaction: Transaction) {
    if (transaction.installmentId) return;
    setEditing(transaction);
    setEditDraft({
      title: transaction.title,
      date: transaction.date,
      amount: String(transaction.amount),
      payerUserId: transaction.payerUserId,
      transactionType: transaction.transactionType,
      splitType: transaction.transactionType === "food" ? "no_split" : transaction.splitType
    });
    setError("");
  }

  async function saveTransaction() {
    if (!editing || !selectedSummary) return;
    const amount = Number(editDraft.amount);
    if (!editDraft.title.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          billingCycleId: selectedSummary.cycle.id,
          date: editDraft.date,
          title: editDraft.title,
          categoryId: editDraft.transactionType === "food" ? "food" : editing.categoryId,
          amount,
          payerUserId: editDraft.payerUserId,
          transactionType: editDraft.transactionType,
          splitType: editDraft.transactionType === "food" ? "no_split" : editDraft.splitType,
          note: editing.note,
          attachmentUrl: editing.attachmentUrl
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? editCopy.updateFailed);
      setEditing(null);
      setRefreshToken((value) => value + 1);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : editCopy.updateFailed);
    } finally {
      setSaving(false);
    }
  }

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
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/settlement"
            className={cn(
              "-ml-3 inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.98]",
              "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{formatCycleLabel(locale, selectedSummary.cycle.startDate)}</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            {selectedSummary.cycle.startDate} - {selectedSummary.cycle.endDate}
          </p>
        </div>
        <Badge>{formatTHB(selectedSummary.cycle.foodBudgetTarget)}</Badge>
      </div>

      <Card className="space-y-3 bg-slate-950 p-4 text-white dark:bg-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-300/15 text-teal-200">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <Badge className="bg-white/10 text-white">{t(locale, "monthlySettlement")}</Badge>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{t(locale, "netTransfer")}</h2>
          </div>
        </div>

        <div className="grid gap-2.5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
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
        <Card className="p-3.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(locale, "budgetAvailable")}</p>
          <p className="mt-1 text-xl font-black">{formatTHB(settlement.food.budgetAvailable)}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(locale, "foodRemaining")}</p>
          <p className="mt-1 text-xl font-black">{formatTHB(settlement.food.remaining)}</p>
        </Card>
        <Card className="p-3.5">
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

      <Card className="p-4">
        <h2 className="text-lg font-black">{editCopy.title}</h2>
        <div className="mt-3 space-y-2">
          {selectedSummary.transactions.map((transaction) => {
            const isEditing = editing?.id === transaction.id;
            if (isEditing) {
              return (
                <div key={transaction.id} className="space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Field label={t(locale, "title")}>
                        <Input value={editDraft.title} onChange={(event) => setEditDraft((value) => ({ ...value, title: event.target.value }))} />
                      </Field>
                    </div>
                    <Field label={t(locale, "date")}>
                      <Input type="date" min={selectedSummary.cycle.startDate} max={selectedSummary.cycle.endDate} value={editDraft.date} onChange={(event) => setEditDraft((value) => ({ ...value, date: event.target.value }))} />
                    </Field>
                    <Field label={t(locale, "amount")}>
                      <Input type="number" min="0.01" step="0.01" value={editDraft.amount} onChange={(event) => setEditDraft((value) => ({ ...value, amount: event.target.value }))} />
                    </Field>
                  </div>
                  <Field label={editCopy.paidBy}>
                    <div className="flex flex-wrap gap-2">
                      {profiles.map((profile) => <Button key={profile.id} type="button" size="sm" variant={editDraft.payerUserId === profile.id ? "primary" : "secondary"} onClick={() => setEditDraft((value) => ({ ...value, payerUserId: profile.id }))}>{profile.displayName}</Button>)}
                    </div>
                  </Field>
                  <Field label={editCopy.type}>
                    <div className="flex flex-wrap gap-2">
                      {(["food", "normal"] as TransactionType[]).map((type) => <Button key={type} type="button" size="sm" variant={editDraft.transactionType === type ? "primary" : "secondary"} onClick={() => setEditDraft((value) => ({ ...value, transactionType: type, splitType: type === "food" ? "no_split" : value.splitType }))}>{type === "food" ? editCopy.food : editCopy.normal}</Button>)}
                    </div>
                  </Field>
                  {editDraft.transactionType !== "food" ? (
                    <Field label={editCopy.split}>
                      <div className="flex flex-wrap gap-2">
                        {(["split_half", "no_split", "full_reimburse"] as SplitType[]).map((split) => <Button key={split} type="button" size="sm" variant={editDraft.splitType === split ? "primary" : "secondary"} onClick={() => setEditDraft((value) => ({ ...value, splitType: split }))}>{split === "split_half" ? editCopy.splitHalf : split === "no_split" ? editCopy.noSplit : editCopy.fullReimburse}</Button>)}
                      </div>
                    </Field>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setEditing(null)}><X className="h-4 w-4" />{editCopy.cancel}</Button>
                    <Button type="button" disabled={saving} onClick={() => void saveTransaction()}><Save className="h-4 w-4" />{editCopy.save}</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={transaction.id} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto] items-center gap-2 rounded-xl bg-[var(--panel-soft-bg)] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{transaction.title}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{formatDetailDate(locale, transaction.date)}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge className={cn("px-2 py-0.5 text-[11px]", transaction.transactionType === "food" ? "bg-[var(--accent-soft)] text-[var(--accent-fg)]" : undefined)}>
                      {getTransactionTypeLabel(locale, transaction.transactionType)}
                    </Badge>
                    <Badge className="px-2 py-0.5 text-[11px]">{getSplitTypeLabel(locale, transaction.splitType)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                    {editCopy.paidBy}: {profiles.find((profile) => profile.id === transaction.payerUserId)?.displayName ?? "-"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="whitespace-nowrap text-sm font-black">{formatTHB(transaction.amount)}</p>
                  {transaction.installmentId ? <span className="px-2 text-xs text-slate-400" title={editCopy.installmentLocked}>🔒</span> : <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => startEditing(transaction)} aria-label={`${editCopy.edit} ${transaction.title}`}><Pencil className="h-4 w-4" /></Button>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
