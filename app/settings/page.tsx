"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Fingerprint, KeyRound, LogOut, Palette, Pencil, Plus, Settings2, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { useUITheme, type UITheme } from "@/hooks/use-ui-theme";
import { t } from "@/i18n/dictionary";
import { createClient } from "@/services/supabase/browser";
import type { TransactionTypePresetBaseType } from "@/types/domain";

type PasskeyItem = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

function settingsCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        summary: "หน้าสรุปยอด",
        importHistory: "หน้าอัปโหลดข้อมูลเก่า",
        appearanceTitle: "ธีมหน้าตาแอป",
        appearanceHint: "เลือกโทนและพื้นผิวของแอปได้ตามสไตล์ที่ชอบ โดยยังใช้ข้อมูลและฟังก์ชันเดิมทั้งหมด",
        themeStandard: "standard",
        themeNeumorphism: "neumorphism",
        themeFlat: "flat",
        themeGlass: "glass morphism",
        themeColourful: "colourful",
        themeStandardHint: "หน้าตาเดิมที่ใช้อยู่ตอนนี้",
        themeNeumorphismHint: "พื้นผิวปุ่มและการ์ดนุ่มขึ้น ดูเหมือนนูนจากพื้น",
        themeFlatHint: "เรียบ คม และลดเงาให้เหลือน้อยที่สุด",
        themeGlassHint: "ใส โปร่ง และมีมิติแบบกระจก",
        themeColourfulHint: "สดขึ้น มีสีสันและคอนทราสต์มากกว่าเดิม",
        summaryHint: "ตั้งงบรอบและกดเข้าไปดูรายละเอียด settlement ของแต่ละรอบได้จากหน้านี้",
        importHint: "ตรวจไฟล์ก่อนและนำเข้าข้อมูลย้อนหลังจาก Excel",
        typePresets: "ประเภทรายการ",
        typePresetsHint: "เพิ่ม ลบ หรือแก้ชื่อประเภทที่ใช้ในหน้าสร้างธุรกรรมได้ โดยระบบยังคง behavior หลักแบบอาหารหรือค่าใช้จ่ายทั่วไป",
        presetName: "ชื่อประเภท",
        presetBehavior: "behavior หลัก",
        presetFood: "แบบอาหาร",
        presetNormal: "แบบค่าใช้จ่ายทั่วไป",
        addPreset: "เพิ่มประเภท",
        savePreset: "บันทึกประเภท",
        editPreset: "แก้ไขประเภท",
        cancelEdit: "ยกเลิกแก้ไข",
        emptyPreset: "ยังไม่มีประเภทที่ตั้งไว้",
        deletePreset: "ลบ",
        saveFailed: "กรุณาใส่ชื่อประเภทก่อนบันทึก",
        securityTitle: "ความปลอดภัยของบัญชี",
        securityHint: "เพิ่ม passkey ไว้ใช้สแกนลายนิ้วมือหรือ Face ID ในครั้งถัดไปแทนการพิมพ์รหัสผ่าน",
        currentEmail: "อีเมลที่ใช้อยู่",
        passwordTitle: "เปลี่ยนรหัสผ่าน",
        passwordHint: "ตั้งรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร แล้วใช้รหัสใหม่นี้สำหรับการเข้าสู่ระบบครั้งถัดไป",
        newPassword: "รหัสผ่านใหม่",
        confirmPassword: "ยืนยันรหัสผ่านใหม่",
        passwordPlaceholder: "อย่างน้อย 6 ตัวอักษร",
        updatePassword: "บันทึกรหัสผ่านใหม่",
        savingPassword: "กำลังบันทึก...",
        passwordUpdated: "อัปเดตรหัสผ่านเรียบร้อย",
        passwordMismatch: "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน",
        passwordTooShort: "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร",
        registerPasskey: "เพิ่ม Passkey บนอุปกรณ์นี้",
        loadingPasskeys: "กำลังโหลด passkeys...",
        emptyPasskeys: "ยังไม่มี passkey ที่ผูกกับบัญชีนี้",
        lastUsed: "ใช้งานล่าสุด",
        addedOn: "เพิ่มเมื่อ",
        removePasskey: "ลบ Passkey",
        passkeyAdded: "เพิ่ม passkey สำเร็จ",
        passkeyRemoved: "ลบ passkey แล้ว",
        securityError: "จัดการข้อมูลความปลอดภัยไม่สำเร็จ",
        signOut: "ออกจากระบบ"
        ,
        pushTitle: "แจ้งเตือนบนมือถือ",
        pushHint: "เปิด Web Push สำหรับแอปที่ติดตั้งบน Home Screen เพื่อให้รู้ทันทีเมื่ออีกคนบันทึกรายการใหม่",
        pushEnable: "เปิดการแจ้งเตือน",
        pushDisable: "ปิดการแจ้งเตือน",
        pushLoading: "กำลังตรวจสอบสถานะการแจ้งเตือน...",
        pushEnabled: "อุปกรณ์นี้เปิดรับการแจ้งเตือนแล้ว",
        pushDisabled: "อุปกรณ์นี้ยังไม่ได้เปิดรับการแจ้งเตือน",
        pushUnsupported: "อุปกรณ์หรือเบราว์เซอร์นี้ยังไม่รองรับ Web Push สำหรับแอปนี้",
        pushPermissionDenied: "เบราว์เซอร์ปฏิเสธสิทธิ์แจ้งเตือน โปรดเปิดสิทธิ์ Notifications ให้ FlowPay ในการตั้งค่าเครื่อง",
        pushInstallHint: "บน iPhone/iPad ควรเปิดใช้งานหลังติดตั้งแอปจาก Home Screen แล้ว",
        pushEnableSuccess: "เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว",
        pushDisableSuccess: "ปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว",
        pushUnavailable: "ระบบหลังบ้านยังไม่ได้ตั้งค่า Web Push",
        pushDemoUnavailable: "โหมดเดโมไม่รองรับการแจ้งเตือนบนมือถือ"
      }
    : {
        summary: "Settlement page",
        importHistory: "Historical import page",
        appearanceTitle: "App appearance",
        appearanceHint: "Pick the visual style you want while keeping the same data and behavior across the app.",
        themeStandard: "standard",
        themeNeumorphism: "neumorphism",
        themeFlat: "flat",
        themeGlass: "glass morphism",
        themeColourful: "colourful",
        themeStandardHint: "The current default FlowPay look",
        themeNeumorphismHint: "Soft raised surfaces with a gentler tactile feel",
        themeFlatHint: "Cleaner, sharper surfaces with minimal shadows",
        themeGlassHint: "Translucent panels with a frosted-glass feel",
        themeColourfulHint: "A brighter look with more accent color throughout",
        summaryHint: "Set each cycle budget and open that cycle for detailed settlement",
        importHint: "Validate and import historical Excel data",
        typePresets: "Transaction type presets",
        typePresetsHint: "Add, remove, or rename the transaction types shown in the transaction form while keeping the core system behavior mapped to food or normal expense.",
        presetName: "Preset name",
        presetBehavior: "Base behavior",
        presetFood: "Food behavior",
        presetNormal: "Normal expense behavior",
        addPreset: "Add preset",
        savePreset: "Save preset",
        editPreset: "Edit preset",
        cancelEdit: "Cancel edit",
        emptyPreset: "No presets yet",
        deletePreset: "Delete",
        saveFailed: "Enter a preset name before saving",
        securityTitle: "Account security",
        securityHint: "Add a passkey so future sign-ins can use your fingerprint, Face ID, or device biometrics instead of typing your password.",
        currentEmail: "Signed-in email",
        passwordTitle: "Change password",
        passwordHint: "Set a new password with at least 6 characters. You will use the new password the next time you sign in.",
        newPassword: "New password",
        confirmPassword: "Confirm new password",
        passwordPlaceholder: "At least 6 characters",
        updatePassword: "Save new password",
        savingPassword: "Saving...",
        passwordUpdated: "Password updated successfully",
        passwordMismatch: "New password and confirmation do not match",
        passwordTooShort: "Password must be at least 6 characters",
        registerPasskey: "Add a passkey on this device",
        loadingPasskeys: "Loading passkeys...",
        emptyPasskeys: "No passkeys are linked to this account yet.",
        lastUsed: "Last used",
        addedOn: "Added",
        removePasskey: "Remove passkey",
        passkeyAdded: "Passkey added successfully",
        passkeyRemoved: "Passkey removed",
        securityError: "Unable to manage account security",
        signOut: "Sign out"
        ,
        pushTitle: "Mobile notifications",
        pushHint: "Enable Web Push for the Home Screen app so you get alerted when your partner records a new transaction.",
        pushEnable: "Enable notifications",
        pushDisable: "Disable notifications",
        pushLoading: "Checking notification status...",
        pushEnabled: "This device is already receiving notifications.",
        pushDisabled: "This device is not receiving notifications yet.",
        pushUnsupported: "This device or browser does not support Web Push for this app.",
        pushPermissionDenied: "Notification permission was denied. Please enable notifications for FlowPay in your device settings.",
        pushInstallHint: "On iPhone and iPad, enable this after installing the app from the Home Screen.",
        pushEnableSuccess: "Notifications are enabled on this device.",
        pushDisableSuccess: "Notifications are disabled on this device.",
        pushUnavailable: "Web Push is not configured for this project yet.",
        pushDemoUnavailable: "Mobile notifications are unavailable in demo mode."
      };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function formatDateTime(locale: "th" | "en", value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function isPasskeysDisabledError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("passkeys are disabled");
}

export default function SettingsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { uiTheme, setUITheme } = useUITheme();
  const copy = settingsCopy(locale);
  const passkeysUnavailableMessage =
    locale === "th" ? "โปรเจ็กต์นี้ยังไม่ได้เปิดใช้งาน Passkeys ในระบบหลังบ้าน" : "Passkeys are not enabled for this project yet.";
  const { mode, transactionTypePresets, addTransactionTypePreset, updateTransactionTypePreset, deleteTransactionTypePreset } = useFlowPayStore();
  const [label, setLabel] = useState("");
  const [baseType, setBaseType] = useState<TransactionTypePresetBaseType>("normal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [busyPasskeyId, setBusyPasskeyId] = useState<string | null>(null);
  const [creatingPasskey, setCreatingPasskey] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [passkeysEnabled, setPasskeysEnabled] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY));
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isStandalone, setIsStandalone] = useState(false);
  const compactFieldClass = "h-7 rounded-lg px-2.5 text-[13px]";
  const compactSelectClass = "h-7 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] dark:border-white/10 dark:bg-white/10";

  const themeOptions: Array<{ value: UITheme; label: string; hint: string }> = [
    { value: "standard", label: copy.themeStandard, hint: copy.themeStandardHint },
    { value: "neumorphism", label: copy.themeNeumorphism, hint: copy.themeNeumorphismHint },
    { value: "flat", label: copy.themeFlat, hint: copy.themeFlatHint },
    { value: "glass", label: copy.themeGlass, hint: copy.themeGlassHint },
    { value: "colourful", label: copy.themeColourful, hint: copy.themeColourfulHint }
  ];

  function resetPresetForm() {
    setLabel("");
    setBaseType("normal");
    setEditingId(null);
    setError("");
  }

  function startEditingPreset(id: string) {
    const preset = transactionTypePresets.find((item) => item.id === id);
    if (!preset) return;

    setEditingId(id);
    setLabel(preset.label);
    setBaseType(preset.baseType);
    setError("");
  }

  function handlePresetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) {
      setError(copy.saveFailed);
      return;
    }

    if (editingId) {
      updateTransactionTypePreset(editingId, { label, baseType });
    } else {
      addTransactionTypePreset({ label, baseType });
    }

    resetPresetForm();
  }

  async function loadPasskeys() {
    setLoadingPasskeys(true);
    setSecurityError("");
    setPasskeysEnabled(true);

    try {
      const supabase = createClient();
      const { data: userResult, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      setCurrentEmail(userResult.user?.email ?? "");

      const { data: passkeyResult, error: passkeyError } = await supabase.auth.passkey.list();
      if (passkeyError) {
        if (isPasskeysDisabledError(passkeyError)) {
          setPasskeys([]);
          setPasskeysEnabled(false);
          return;
        }

        throw passkeyError;
      }

      setPasskeys(passkeyResult ?? []);
    } catch (loadError: unknown) {
      setSecurityError(loadError instanceof Error ? loadError.message : copy.securityError);
    } finally {
      setLoadingPasskeys(false);
    }
  }

  useEffect(() => {
    void loadPasskeys();
  }, []);

  async function loadPushStatus() {
    setPushLoading(true);
    setPushError("");
    setPushConfigured(Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY));

    if (mode !== "production") {
      setPushSupported(false);
      setPushEnabled(false);
      setPushLoading(false);
      return;
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setPushSupported(false);
      setPushEnabled(false);
      setPushLoading(false);
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushSupported(false);
      setPushEnabled(false);
      setPushLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setPushSupported(true);
      setPushEnabled(Boolean(subscription));
      setIsStandalone(isStandaloneMode());
    } catch (error: unknown) {
      setPushSupported(false);
      setPushEnabled(false);
      setPushError(error instanceof Error ? error.message : copy.pushUnsupported);
    } finally {
      setPushLoading(false);
    }
  }

  useEffect(() => {
    void loadPushStatus();
  }, [mode]);

  async function handleRegisterPasskey() {
    setCreatingPasskey(true);
    setSecurityError("");
    setSecurityMessage("");

    try {
      if (!passkeysEnabled) {
        setSecurityMessage(passkeysUnavailableMessage);
        return;
      }

      const supabase = createClient();
      const { error: registerError } = await supabase.auth.registerPasskey();

      if (registerError) {
        throw registerError;
      }

      setSecurityMessage(copy.passkeyAdded);
      await loadPasskeys();
    } catch (registerError: unknown) {
      setSecurityError(registerError instanceof Error ? registerError.message : copy.securityError);
    } finally {
      setCreatingPasskey(false);
    }
  }

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityError("");
    setSecurityMessage("");

    if (newPassword.length < 6) {
      setSecurityError(copy.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError(copy.passwordMismatch);
      return;
    }

    setPasswordLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setNewPassword("");
      setConfirmPassword("");
      setSecurityMessage(copy.passwordUpdated);
    } catch (updateError: unknown) {
      setSecurityError(updateError instanceof Error ? updateError.message : copy.securityError);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeletePasskey(passkeyId: string) {
    setBusyPasskeyId(passkeyId);
    setSecurityError("");
    setSecurityMessage("");

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.auth.passkey.delete({ passkeyId });

      if (deleteError) {
        throw deleteError;
      }

      setSecurityMessage(copy.passkeyRemoved);
      await loadPasskeys();
    } catch (deleteError: unknown) {
      setSecurityError(deleteError instanceof Error ? deleteError.message : copy.securityError);
    } finally {
      setBusyPasskeyId(null);
    }
  }

  async function handleSignOut() {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          const response = await fetch("/api/push-subscriptions", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          }).catch(() => null);

          if (response?.ok === false) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? "Failed to unregister push subscription");
          }

          await subscription.unsubscribe().catch(() => undefined);
        }
      } catch {
        // Best effort cleanup before sign out.
      }
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError("");
    setPushMessage("");

    try {
      if (mode !== "production") {
        setPushError(copy.pushDemoUnavailable);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setPushError(copy.pushUnavailable);
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPushError(copy.pushUnsupported);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError(copy.pushPermissionDenied);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(subscription.toJSON())
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to enable push notifications");
      }

      setPushEnabled(true);
      setPushSupported(true);
      setPushMessage(copy.pushEnableSuccess);
      setIsStandalone(isStandaloneMode());
    } catch (error: unknown) {
      setPushError(error instanceof Error ? error.message : copy.pushUnsupported);
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    setPushError("");
    setPushMessage("");

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushEnabled(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const response = await fetch("/api/push-subscriptions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to disable push notifications");
        }

        await subscription.unsubscribe();
      }

      setPushEnabled(false);
      setPushMessage(copy.pushDisableSuccess);
    } catch (error: unknown) {
      setPushError(error instanceof Error ? error.message : copy.pushUnsupported);
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <Card className="overflow-hidden p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-xl">{t(locale, "settings")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.appearanceHint}</p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <Palette className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{copy.appearanceTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.appearanceHint}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {themeOptions.map((option) => {
            const active = uiTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setUITheme(option.value)}
                className={[
                  "rounded-lg border px-3 py-2.5 text-left transition",
                  active
                    ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/20"
                    : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                ].join(" ")}
              >
                <p className="text-sm font-semibold capitalize">{option.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{option.hint}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-500 text-slate-950">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{copy.securityTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.securityHint}</p>
            <p className="mt-1.5 text-[13px] font-medium">
              {copy.currentEmail}: <span className="text-slate-500 dark:text-slate-400">{currentEmail || "-"}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-lg px-2 text-[11px]"
            onClick={() => void handleRegisterPasskey()}
            disabled={creatingPasskey || loadingPasskeys || passwordLoading || !passkeysEnabled}
          >
            <Fingerprint className="h-4 w-4" />
            {copy.registerPasskey}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => void handleSignOut()} disabled={passwordLoading}>
            <LogOut className="h-4 w-4" />
            {copy.signOut}
          </Button>
        </div>

        <form className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-white/10" onSubmit={handlePasswordUpdate}>
          <div className="flex items-start gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold">{copy.passwordTitle}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{copy.passwordHint}</p>
            </div>
          </div>

          <div className="mt-2.5 grid gap-1.5 md:grid-cols-2">
            <Field label={copy.newPassword}>
              <Input
                className={compactFieldClass}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={copy.passwordPlaceholder}
              />
            </Field>
            <Field label={copy.confirmPassword}>
              <Input
                className={compactFieldClass}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={copy.passwordPlaceholder}
              />
            </Field>
          </div>

          <Button type="submit" size="sm" className="mt-2.5 h-7 rounded-lg px-2 text-[11px]" disabled={passwordLoading || !newPassword || !confirmPassword}>
            <KeyRound className="h-4 w-4" />
            {passwordLoading ? copy.savingPassword : copy.updatePassword}
          </Button>
        </form>

        <div className="mt-3 space-y-1.5">
          {loadingPasskeys ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.loadingPasskeys}</p>
          ) : passkeys.length ? (
            passkeys.map((passkey) => (
              <div key={passkey.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-white/10">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{passkey.friendly_name || "Passkey"}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {copy.addedOn}: {formatDateTime(locale, passkey.created_at)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {copy.lastUsed}: {formatDateTime(locale, passkey.last_used_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 rounded-lg px-2 text-[11px] text-red-500"
                  onClick={() => void handleDeletePasskey(passkey.id)}
                  disabled={busyPasskeyId === passkey.id || !passkeysEnabled}
                >
                  <Trash2 className="h-4 w-4" />
                  {copy.removePasskey}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.emptyPasskeys}</p>
          )}
        </div>

        {!passkeysEnabled ? <p className="mt-4 text-sm text-amber-600 dark:text-amber-300">{passkeysUnavailableMessage}</p> : null}
        {securityError ? <p className="mt-4 text-sm text-red-500">{securityError}</p> : null}
        {!securityError && securityMessage ? <p className="mt-4 text-sm text-teal-600 dark:text-teal-300">{securityMessage}</p> : null}

        <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-white/10">
          <div className="flex items-start gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold">{copy.pushTitle}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{copy.pushHint}</p>
            </div>
          </div>

          <p className="mt-2.5 text-[13px] font-medium">
            {pushLoading
              ? copy.pushLoading
              : pushEnabled
                ? copy.pushEnabled
                : pushSupported
                  ? copy.pushDisabled
                  : pushConfigured
                    ? copy.pushUnsupported
                    : mode === "production"
                      ? copy.pushUnavailable
                      : copy.pushDemoUnavailable}
          </p>
          {pushSupported && !isStandalone ? <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">{copy.pushInstallHint}</p> : null}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-lg px-2 text-[11px]"
              onClick={() => void handleEnablePush()}
              disabled={pushBusy || pushLoading || !pushConfigured || mode !== "production"}
            >
              <Bell className="h-4 w-4" />
              {copy.pushEnable}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-[11px]"
              onClick={() => void handleDisablePush()}
              disabled={pushBusy || pushLoading || !pushEnabled}
            >
              <BellOff className="h-4 w-4" />
              {copy.pushDisable}
            </Button>
          </div>

          {pushError ? <p className="mt-2 text-sm text-red-500">{pushError}</p> : null}
          {!pushError && pushMessage ? <p className="mt-2 text-sm text-teal-600 dark:text-teal-300">{pushMessage}</p> : null}
        </div>
      </Card>

      <Card className="overflow-hidden p-3 sm:p-4">
        <div className="flex items-start gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
            <Plus className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{copy.typePresets}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{copy.typePresetsHint}</p>
          </div>
        </div>

        <form className="mt-3 space-y-2" onSubmit={handlePresetSubmit}>
          <div className="grid gap-1.5 md:grid-cols-[1.1fr_0.9fr_auto]">
            <Field label={copy.presetName}>
              <Input className={compactFieldClass} value={label} onChange={(event) => setLabel(event.target.value)} placeholder={copy.presetName} />
            </Field>
            <Field label={copy.presetBehavior}>
              <select
                className={compactSelectClass}
                value={baseType}
                onChange={(event) => setBaseType(event.target.value as TransactionTypePresetBaseType)}
              >
                <option value="food">{copy.presetFood}</option>
                <option value="normal">{copy.presetNormal}</option>
              </select>
            </Field>
            <div className="flex items-end gap-1">
              <Button type="submit" size="sm" className="h-7 rounded-lg px-2 text-[11px]">
                <Plus className="h-4 w-4" />
                {editingId ? copy.savePreset : copy.addPreset}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={resetPresetForm}>
                  {copy.cancelEdit}
                </Button>
              ) : null}
            </div>
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </form>

        <div className="mt-3 space-y-1.5">
          {transactionTypePresets.length ? (
            transactionTypePresets.map((preset) => (
              <div key={preset.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-white/10">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{preset.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {preset.baseType === "food" ? copy.presetFood : copy.presetNormal}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button type="button" size="sm" variant="secondary" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => startEditingPreset(preset.id)}>
                    <Pencil className="h-4 w-4" />
                    {copy.editPreset}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 rounded-lg px-2 text-[11px] text-red-500" onClick={() => deleteTransactionTypePreset(preset.id)}>
                    <Trash2 className="h-4 w-4" />
                    {copy.deletePreset}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.emptyPreset}</p>
          )}
        </div>

        <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 dark:border-white/10">
          <Link href="/settlement" className="block rounded-lg border border-slate-200 px-3 py-2.5 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <p className="text-sm font-semibold">{copy.summary}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{copy.summaryHint}</p>
          </Link>
          <Link href="/import-history" className="block rounded-lg border border-slate-200 px-3 py-2.5 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <p className="text-sm font-semibold">{copy.importHistory}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{copy.importHint}</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
