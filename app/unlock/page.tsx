"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CreditCard, Fingerprint, Wallet } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

const keypadValues = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function UnlockPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const copy =
    locale === "th"
      ? {
          brand: "FlowPay",
          title: "เข้าสู่บ้านของคุณ",
          subtitle: "กรอกรหัสบ้านเพื่อเข้าสู่รายการรายจ่าย สำหรับแชมป์ และลิลลี่โดยเฉพาะ",
          label: "รหัสบ้าน",
          placeholder: "ใส่รหัสบ้าน",
          helper: "แตะตัวเลขหรือพิมพ์จากคีย์บอร์ดได้",
          wrongCode: "รหัสบ้านไม่ถูกต้อง",
          checking: "กำลังตรวจสอบรหัส...",
          submit: "เข้าสู่แอป",
          reset: "ล้าง",
          sideTitle: "จัดการเงินคู่แบบเรียบง่าย",
          sideBody: "รวมรายการการใช้จ่าย อยู่ในที่เดียวกันพร้อมมุมมองที่เข้าใจง่าย",
          featureWallet: "กระเป๋าเงินร่วม",
          featureCards: "ติดตามงวดผ่อนอัตโนมัติ",
          featureSummary: "สรุปรายรอบแบบชัดเจน"
        }
      : {
          brand: "FlowPay",
          title: "ํYour household key",
          subtitle: "Enter your household code to access shared wallet balances, installments, and monthly summaries.",
          label: "Household code",
          placeholder: "Enter household code",
          helper: "Tap the keypad or type from your keyboard",
          wrongCode: "Incorrect household code",
          checking: "Checking code...",
          submit: "Enter FlowPay",
          reset: "Clear",
          sideTitle: "Shared money, made calmer",
          sideBody: "Food budget, recurring installments, and monthly settlement all live in one focused space.",
          featureWallet: "Shared food wallet",
          featureCards: "Automatic installment tracking",
          featureSummary: "Clear cycle-by-cycle summaries"
        };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submitCode(nextCode: string) {
    if (!nextCode || loading) return;

    setError("");
    setLoading(true);

    const response = await fetch("/api/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code: nextCode })
    });

    if (!response.ok) {
      setLoading(false);
      setCode("");
      setError(copy.wrongCode);
      return;
    }

    const nextPath = searchParams.get("next");
    router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/");
    router.refresh();
  }

  function appendDigit(digit: string) {
    if (loading) return;
    setCode((current) => `${current}${digit}`);
    setError("");
  }

  function removeDigit() {
    if (loading) return;
    setCode((current) => current.slice(0, -1));
    setError("");
  }

  function resetDigits() {
    if (loading) return;
    setCode("");
    setError("");
  }

  function handleInput(value: string) {
    setCode(value.replace(/\D/g, ""));
    setError("");
  }

  const maskedCode = code.length ? "\u2022".repeat(code.length) : "";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_30%),linear-gradient(180deg,_#f6f8fb_0%,_#eef6f6_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.15),_transparent_24%),linear-gradient(180deg,_#07111f_0%,_#0a1727_100%)] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-10%] h-72 w-72 rounded-full bg-teal-300/35 blur-3xl dark:bg-teal-400/15" />
        <div className="absolute bottom-[-8%] right-[-6%] h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-300/10" />
        <div className="absolute left-[10%] top-[12%] hidden h-44 w-44 rounded-[2.75rem] border border-white/60 bg-white/50 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur md:block dark:border-white/10 dark:bg-white/[0.05]" />
        <div className="absolute left-[18%] top-[30%] hidden h-60 w-60 -rotate-12 rounded-[3rem] border border-white/60 bg-white/35 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur lg:block dark:border-white/10 dark:bg-white/[0.04]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-7xl items-stretch lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden px-8 py-10 lg:flex lg:min-h-screen lg:flex-col lg:justify-between">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-teal-300 dark:bg-white dark:text-slate-950">FP</div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">FlowPay</p>
                <p className="text-base font-bold">{copy.brand}</p>
              </div>
            </div>

            <div className="mt-16">
              <h1 className="max-w-xl text-5xl font-black leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white">{copy.sideTitle}</h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">{copy.sideBody}</p>
            </div>
          </div>

          <div className="grid max-w-xl gap-4">
            <div className="grid grid-cols-[auto_1fr] gap-4 rounded-[2rem] border border-slate-200/70 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">{copy.featureWallet}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.featureSummary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[2rem] border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05]">
                <CreditCard className="h-5 w-5 text-teal-600 dark:text-teal-300" />
                <p className="mt-6 text-lg font-bold">{copy.featureCards}</p>
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/15 dark:border-white/10 dark:bg-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-teal-200">FlowPay</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">Household</span>
                </div>
                <div className="relative mt-8 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                  <div className="absolute right-[-1.5rem] top-[-1.5rem] h-20 w-20 rounded-full bg-teal-400/20 blur-2xl" />
                  <div className="flex items-end gap-2">
                    <div className="h-10 w-8 rounded-t-2xl bg-teal-300/80" />
                    <div className="h-16 w-8 rounded-t-2xl bg-cyan-200/80" />
                    <div className="h-12 w-8 rounded-t-2xl bg-white/50" />
                    <div className="h-20 w-8 rounded-t-2xl bg-teal-200/90" />
                    <div className="h-14 w-8 rounded-t-2xl bg-cyan-100/70" />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-200" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/60" />
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                    <div>
                      <div className="h-2.5 w-16 rounded-full bg-white/20" />
                      <div className="mt-2 h-2.5 w-24 rounded-full bg-white/10" />
                    </div>
                    <div className="flex gap-1.5">
                      <span className="h-8 w-2 rounded-full bg-teal-300/80" />
                      <span className="h-5 w-2 rounded-full bg-cyan-200/70" />
                      <span className="h-10 w-2 rounded-full bg-white/60" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-dvh w-full items-center justify-center px-0 py-0 sm:px-6 sm:py-6 lg:justify-end lg:pr-8 xl:pr-12">
          <div className="flex min-h-dvh w-full max-w-[23rem] flex-col justify-between rounded-none border-0 bg-white/90 px-5 py-5 shadow-none backdrop-blur md:min-h-0 md:justify-start md:rounded-[2.5rem] md:border md:border-slate-200/70 md:px-8 md:py-9 md:shadow-[0_32px_90px_rgba(15,23,42,0.12)] dark:bg-[#0c1826]/90 dark:md:border-white/10 dark:md:shadow-[0_32px_90px_rgba(0,0,0,0.35)]">
            <div>
            <input
              ref={inputRef}
              value={code}
              onChange={(event) => handleInput(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={copy.label}
              className="sr-only"
            />

            <div className="lg:hidden">
              <div className="inline-flex items-center gap-3 px-1 py-1">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-teal-300 dark:bg-white dark:text-slate-950">FP</div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">FlowPay</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-left md:mt-8 lg:mt-0">
              <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">{copy.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
            </div>

            <div className="mt-6 rounded-[2rem] border border-slate-200/80 bg-[#f8fbfb] p-4 shadow-inner shadow-teal-100/30 md:mt-8 dark:border-white/10 dark:bg-white/[0.04]" onClick={() => inputRef.current?.focus()}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{copy.label}</p>
              <div className="mt-3 flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-4 text-2xl font-bold tracking-[0.35em] text-slate-950 shadow-sm dark:border-white/10 dark:bg-[#0b1320] dark:text-white">
                <span className={maskedCode ? "" : "tracking-normal text-base font-medium text-slate-400 dark:text-slate-500"}>
                  {maskedCode || copy.placeholder}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{copy.helper}</p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-2.5 md:mt-8 md:gap-x-4 md:gap-y-4">
              {keypadValues.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => appendDigit(digit)}
                  disabled={loading}
                  className="h-12 rounded-[1.25rem] border border-transparent bg-transparent text-2xl font-bold text-slate-800 transition hover:border-slate-200 hover:bg-white hover:shadow-sm active:scale-[0.97] disabled:opacity-40 md:h-14 md:rounded-[1.4rem] dark:text-white dark:hover:border-white/10 dark:hover:bg-white/[0.05]"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={resetDigits}
                disabled={loading || code.length === 0}
                className="h-12 rounded-[1.25rem] text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-950 active:scale-[0.97] disabled:opacity-30 md:h-14 md:rounded-[1.4rem] dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                {copy.reset}
              </button>

              <button
                type="button"
                onClick={() => appendDigit("0")}
                disabled={loading}
                className="h-12 rounded-[1.25rem] border border-transparent bg-transparent text-2xl font-bold text-slate-800 transition hover:border-slate-200 hover:bg-white hover:shadow-sm active:scale-[0.97] disabled:opacity-40 md:h-14 md:rounded-[1.4rem] dark:text-white dark:hover:border-white/10 dark:hover:bg-white/[0.05]"
              >
                0
              </button>

              <button
                type="button"
                onClick={removeDigit}
                disabled={loading || code.length === 0}
                className="grid h-12 place-items-center rounded-[1.25rem] text-slate-500 transition hover:bg-white hover:text-slate-950 active:scale-[0.97] disabled:opacity-30 md:h-14 md:rounded-[1.4rem] dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                aria-label="Delete digit"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => void submitCode(code)}
                disabled={loading || code.length === 0}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-[1.35rem] bg-teal-500 px-5 text-base font-bold text-slate-950 shadow-lg shadow-teal-500/25 transition hover:bg-teal-400 active:scale-[0.99] disabled:opacity-40 md:h-14 md:rounded-[1.6rem]"
              >
                <Fingerprint className="h-5 w-5" />
                {loading ? copy.checking : copy.submit}
              </button>

              <div className="mt-3 min-h-5 text-center md:mt-5 md:min-h-6">
                {error ? <p className="text-sm font-medium text-rose-500">{error}</p> : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={null}>
      <UnlockPageContent />
    </Suspense>
  );
}
