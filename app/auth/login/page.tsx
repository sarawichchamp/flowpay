"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fingerprint, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/hooks/use-locale";
import { createClient } from "@/services/supabase/browser";

function loginCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        title: "เข้าสู่ FlowPay",
        subtitle: "เข้าใช้ด้วยอีเมลและรหัสผ่านที่ผู้ดูแลสร้างไว้ล่วงหน้า หรือใช้ passkey ของอุปกรณ์ถ้าเคยผูกไว้แล้ว",
        passwordTitle: "เข้าใช้ด้วยบัญชีที่กำหนดไว้",
        passwordHint: "เฉพาะอีเมลสมาชิกที่ถูกสร้างไว้ล่วงหน้าเท่านั้นจึงจะเข้าใช้งานได้",
        emailLabel: "อีเมลสมาชิก",
        emailPlaceholder: "name@example.com",
        passwordLabel: "รหัสผ่าน",
        passwordPlaceholder: "ใส่รหัสผ่าน",
        passwordButton: "เข้าสู่ระบบ",
        passkeyTitle: "เข้าใช้ด้วย Passkey",
        passkeyHint: "ใช้ลายนิ้วมือ Face ID หรือการยืนยันตัวตนของอุปกรณ์หลังจากผูก passkey แล้ว",
        passkeyButton: "เข้าใช้ด้วย Passkey",
        signingIn: "กำลังตรวจสอบ...",
        notMember: "บัญชีนี้ไม่ได้รับอนุญาตให้ใช้บ้านนี้",
        unknownError: "ไม่สามารถเข้าสู่ระบบได้",
        passkeyUnsupported: "อุปกรณ์หรือเบราว์เซอร์นี้ยังไม่รองรับ passkey"
      }
    : {
        title: "Sign in to FlowPay",
        subtitle: "Use the pre-created email and password for your household account, or use a passkey if this device was already enrolled.",
        passwordTitle: "Sign in with an approved account",
        passwordHint: "Only household emails that were created in advance are allowed to sign in.",
        emailLabel: "Household email",
        emailPlaceholder: "name@example.com",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter password",
        passwordButton: "Sign in",
        passkeyTitle: "Continue with passkey",
        passkeyHint: "Use your fingerprint, Face ID, or device biometric after a passkey has already been added.",
        passkeyButton: "Sign in with passkey",
        signingIn: "Signing in...",
        notMember: "This account is not allowed to access this household.",
        unknownError: "Unable to sign in",
        passkeyUnsupported: "This browser or device does not support passkeys"
      };
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const copy = loginCopy(locale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "not-member" ? copy.notMember : "");
  const [message, setMessage] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") ? next : "/";
  }, [searchParams]);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setError("");
    setMessage("");
    setPasswordLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (signInError: unknown) {
      setError(signInError instanceof Error ? signInError.message : copy.unknownError);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handlePasskeySignIn() {
    setError("");
    setMessage("");
    setPasskeyLoading(true);

    try {
      const supabase = createClient();
      const { error: passkeyError } = await supabase.auth.signInWithPasskey();

      if (passkeyError) {
        throw passkeyError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (signInError: unknown) {
      const messageText = signInError instanceof Error ? signInError.message : copy.unknownError;
      setError(messageText.includes("WebAuthn") ? copy.passkeyUnsupported : messageText);
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_30%),linear-gradient(180deg,_#f6f8fb_0%,_#eef6f6_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.12),_transparent_24%),linear-gradient(180deg,_#07111f_0%,_#0a1727_100%)]">
      <Card className="w-full max-w-xl space-y-6 border-slate-200/80 bg-white/90 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-[#0c1826]/90">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">FlowPay</p>
          <h1 className="mt-3 text-3xl font-black">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>

        <section className="rounded-[1.75rem] border border-slate-200/80 p-5 dark:border-white/10">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{copy.passwordTitle}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.passwordHint}</p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handlePasswordSignIn}>
            <Field label={copy.emailLabel}>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={copy.emailPlaceholder}
              />
            </Field>

            <Field label={copy.passwordLabel}>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.passwordPlaceholder}
              />
            </Field>

            <Button type="submit" className="h-12 w-full" disabled={passwordLoading || passkeyLoading || !email.trim() || !password}>
              <Mail className="h-4 w-4" />
              {passwordLoading ? copy.signingIn : copy.passwordButton}
            </Button>
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-500 text-slate-950">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{copy.passkeyTitle}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.passkeyHint}</p>
            </div>
          </div>
          <Button className="mt-5 h-12 w-full" onClick={() => void handlePasskeySignIn()} disabled={passkeyLoading || passwordLoading}>
            <KeyRound className="h-4 w-4" />
            {passkeyLoading ? copy.signingIn : copy.passkeyButton}
          </Button>
        </section>

        {error ? <p className="text-sm font-medium text-rose-500">{error}</p> : null}
        {!error && message ? <p className="text-sm font-medium text-teal-600 dark:text-teal-300">{message}</p> : null}
      </Card>
    </div>
  );
}
