create extension if not exists "pgcrypto";

create table if not exists public.translation_pairs (
  id uuid primary key default gen_random_uuid(),
  translation_key text not null unique,
  thai_text text not null,
  english_text text not null,
  source_file text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint translation_pairs_key_length check (char_length(translation_key) between 1 and 100)
);

create index if not exists translation_pairs_key_idx on public.translation_pairs (translation_key);

alter table public.translation_pairs enable row level security;

create or replace function public.is_household_member(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = user_id)
    and (select count(*) from public.profiles) <= 2;
$$;

drop policy if exists "household can manage translation pairs" on public.translation_pairs;

create policy "household can manage translation pairs"
on public.translation_pairs for all
to authenticated
using (public.is_household_member(auth.uid()))
with check (public.is_household_member(auth.uid()));

create or replace function public.touch_translation_pairs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists translation_pairs_touch_updated_at on public.translation_pairs;

create trigger translation_pairs_touch_updated_at
before update on public.translation_pairs
for each row execute function public.touch_translation_pairs_updated_at();

with seed as (
  select *
  from jsonb_to_recordset($json$[
  {
    "translation_key": "addTransaction",
    "thai_text": "เพิ่มรายการ",
    "english_text": "Add transaction",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "addTransactionTitle",
    "thai_text": "เพิ่มรายการ",
    "english_text": "Add transaction",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "allSettled",
    "thai_text": "เคลียร์ครบแล้ว",
    "english_text": "All settled",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "amount",
    "thai_text": "จำนวนเงิน",
    "english_text": "Amount",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.emailLabel",
    "thai_text": "อีเมลสมาชิก",
    "english_text": "Household email",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.emailPlaceholder",
    "thai_text": "name@example.com",
    "english_text": "name@example.com",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.notMember",
    "thai_text": "บัญชีนี้ไม่ได้รับอนุญาตให้ใช้บ้านนี้",
    "english_text": "This account is not allowed to access this household.",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passkeyButton",
    "thai_text": "เข้าใช้ด้วย Passkey",
    "english_text": "Sign in with passkey",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passkeyHint",
    "thai_text": "ใช้ลายนิ้วมือ Face ID หรือการยืนยันตัวตนของอุปกรณ์หลังจากผูก passkey แล้ว",
    "english_text": "Use your fingerprint, Face ID, or device biometric after a passkey has already been added.",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passkeyTitle",
    "thai_text": "เข้าใช้ด้วย Passkey",
    "english_text": "Continue with passkey",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passkeyUnsupported",
    "thai_text": "อุปกรณ์หรือเบราว์เซอร์นี้ยังไม่รองรับ passkey",
    "english_text": "This browser or device does not support passkeys",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passwordButton",
    "thai_text": "เข้าสู่ระบบ",
    "english_text": "Sign in",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passwordHint",
    "thai_text": "เฉพาะอีเมลสมาชิกที่ถูกสร้างไว้ล่วงหน้าเท่านั้นจึงจะเข้าใช้งานได้",
    "english_text": "Only household emails that were created in advance are allowed to sign in.",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passwordLabel",
    "thai_text": "รหัสผ่าน",
    "english_text": "Password",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passwordPlaceholder",
    "thai_text": "ใส่รหัสผ่าน",
    "english_text": "Enter password",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.passwordTitle",
    "thai_text": "เข้าใช้ด้วยบัญชีที่กำหนดไว้",
    "english_text": "Sign in with an approved account",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.signingIn",
    "thai_text": "กำลังตรวจสอบ...",
    "english_text": "Signing in...",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.subtitle",
    "thai_text": "เข้าใช้ด้วยอีเมลและรหัสผ่านที่ผู้ดูแลสร้างไว้ล่วงหน้า หรือใช้ passkey ของอุปกรณ์ถ้าเคยผูกไว้แล้ว",
    "english_text": "Use the pre-created email and password for your household account, or use a passkey if this device was already enrolled.",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.title",
    "thai_text": "เข้าสู่ FlowPay",
    "english_text": "Sign in to FlowPay",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/auth/login/page.tsx.loginCopy.unknownError",
    "thai_text": "ไม่สามารถเข้าสู่ระบบได้",
    "english_text": "Unable to sign in",
    "source_file": "app/auth/login/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.file",
    "thai_text": "ไฟล์ Excel",
    "english_text": "Excel file",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.helper",
    "thai_text": "ใช้ไฟล์ .xlsx ที่มีชีต BillingCycles, Transactions และ Installments",
    "english_text": "Use a .xlsx file with BillingCycles, Transactions, and Installments sheets.",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.importFailed",
    "thai_text": "นำเข้าข้อมูลไม่สำเร็จ",
    "english_text": "Import failed",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.result",
    "thai_text": "ผลการนำเข้า",
    "english_text": "Import result",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.subtitle",
    "thai_text": "ระบบจะตรวจไฟล์ก่อนเสมอ ถ้ามีแถวผิดจะหยุดและแจ้งรายการที่ต้องแก้ก่อนเขียนข้อมูลจริง",
    "english_text": "The file is validated first. If any row is invalid, import stops and shows the errors before writing data.",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.template",
    "thai_text": "ดาวน์โหลด Excel template",
    "english_text": "Download Excel template",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.title",
    "thai_text": "อัปโหลดข้อมูลย้อนหลัง",
    "english_text": "Import historical data",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.upload",
    "thai_text": "ตรวจและอัปโหลดข้อมูล",
    "english_text": "Validate and upload",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.uploading",
    "thai_text": "กำลังตรวจไฟล์...",
    "english_text": "Validating...",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/import-history/page.tsx.importCopy.validationTitle",
    "thai_text": "รายการที่ต้องแก้ก่อนนำเข้า",
    "english_text": "Fix these rows before importing",
    "source_file": "app/import-history/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.activeInstallments",
    "thai_text": "ผ่อนชำระที่ยังไม่จบ",
    "english_text": "Active installments",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.currentCarryOver",
    "thai_text": "ยอดยกไปล่าสุด",
    "english_text": "Latest carry over",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.finalTransfer",
    "thai_text": "ยอดโอนสุทธิ",
    "english_text": "Final transfer",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.foodSpent",
    "thai_text": "ค่าอาหารใช้ไป",
    "english_text": "Food spent",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.installments",
    "thai_text": "ผ่อน",
    "english_text": "installments",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.noData",
    "thai_text": "ยังไม่มีข้อมูลสรุปรายเดือน",
    "english_text": "No monthly summary data yet",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.noTransfer",
    "thai_text": "หักลบแล้วพอดี",
    "english_text": "Balanced after offset",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.remaining",
    "thai_text": "คงเหลือ",
    "english_text": "Remaining",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.subtitle",
    "thai_text": "ดูภาพรวมแต่ละรอบบิลย้อนหลังจากข้อมูลจริงในระบบ",
    "english_text": "Review historical cycle summaries from production data.",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.title",
    "thai_text": "สรุปรายเดือน",
    "english_text": "Monthly summary",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.totalCycles",
    "thai_text": "จำนวนรอบบิล",
    "english_text": "Billing cycles",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/monthly-summary/page.tsx.monthlyCopy.transactions",
    "thai_text": "รายการ",
    "english_text": "transactions",
    "source_file": "app/monthly-summary/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.line_129",
    "thai_text": "โปรเจ็กต์นี้ยังไม่ได้เปิดใช้งาน Passkeys ในระบบหลังบ้าน",
    "english_text": "Passkeys are not enabled for this project yet.",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.addedOn",
    "thai_text": "เพิ่มเมื่อ",
    "english_text": "Added",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.addPreset",
    "thai_text": "เพิ่มประเภท",
    "english_text": "Add preset",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.cancelEdit",
    "thai_text": "ยกเลิกแก้ไข",
    "english_text": "Cancel edit",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.confirmPassword",
    "thai_text": "ยืนยันรหัสผ่านใหม่",
    "english_text": "Confirm new password",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.currentEmail",
    "thai_text": "อีเมลที่ใช้อยู่",
    "english_text": "Signed-in email",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.deletePreset",
    "thai_text": "ลบ",
    "english_text": "Delete",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.editPreset",
    "thai_text": "แก้ไขประเภท",
    "english_text": "Edit preset",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.emptyPasskeys",
    "thai_text": "ยังไม่มี passkey ที่ผูกกับบัญชีนี้",
    "english_text": "No passkeys are linked to this account yet.",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.emptyPreset",
    "thai_text": "ยังไม่มีประเภทที่ตั้งไว้",
    "english_text": "No presets yet",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.importHint",
    "thai_text": "ตรวจไฟล์ก่อนและนำเข้าข้อมูลย้อนหลังจาก Excel",
    "english_text": "Validate and import historical Excel data",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.importHistory",
    "thai_text": "หน้าอัปโหลดข้อมูลเก่า",
    "english_text": "Historical import page",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.lastUsed",
    "thai_text": "ใช้งานล่าสุด",
    "english_text": "Last used",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.loadingPasskeys",
    "thai_text": "กำลังโหลด passkeys...",
    "english_text": "Loading passkeys...",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.newPassword",
    "thai_text": "รหัสผ่านใหม่",
    "english_text": "New password",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.passkeyAdded",
    "thai_text": "เพิ่ม passkey สำเร็จ",
    "english_text": "Passkey added successfully",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.passkeyRemoved",
    "thai_text": "ลบ passkey แล้ว",
    "english_text": "Passkey removed",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.passwordHint",
    "thai_text": "ตั้งรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร แล้วใช้รหัสใหม่นี้สำหรับการเข้าสู่ระบบครั้งถัดไป",
    "english_text": "Set a new password with at least 6 characters. You will use the new password the next time you sign in.",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.passwordMismatch",
    "thai_text": "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน",
    "english_text": "New password and confirmation do not match",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.passwordPlaceholder",
    "thai_text": "อย่างน้อย 6 ตัวอักษร",
    "english_text": "At least 6 characters",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.passwordTitle",
    "thai_text": "เปลี่ยนรหัสผ่าน",
    "english_text": "Change password",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.passwordTooShort",
    "thai_text": "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร",
    "english_text": "Password must be at least 6 characters",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.passwordUpdated",
    "thai_text": "อัปเดตรหัสผ่านเรียบร้อย",
    "english_text": "Password updated successfully",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.presetBehavior",
    "thai_text": "behavior หลัก",
    "english_text": "Base behavior",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.presetFood",
    "thai_text": "แบบอาหาร",
    "english_text": "Food behavior",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.presetName",
    "thai_text": "ชื่อประเภท",
    "english_text": "Preset name",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.presetNormal",
    "thai_text": "แบบค่าใช้จ่ายทั่วไป",
    "english_text": "Normal expense behavior",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.registerPasskey",
    "thai_text": "เพิ่ม Passkey บนอุปกรณ์นี้",
    "english_text": "Add a passkey on this device",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.removePasskey",
    "thai_text": "ลบ Passkey",
    "english_text": "Remove passkey",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.saveFailed",
    "thai_text": "กรุณาใส่ชื่อประเภทก่อนบันทึก",
    "english_text": "Enter a preset name before saving",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.savePreset",
    "thai_text": "บันทึกประเภท",
    "english_text": "Save preset",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.savingPassword",
    "thai_text": "กำลังบันทึก...",
    "english_text": "Saving...",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.securityError",
    "thai_text": "จัดการข้อมูลความปลอดภัยไม่สำเร็จ",
    "english_text": "Unable to manage account security",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.securityHint",
    "thai_text": "เพิ่ม passkey ไว้ใช้สแกนลายนิ้วมือหรือ Face ID ในครั้งถัดไปแทนการพิมพ์รหัสผ่าน",
    "english_text": "Add a passkey so future sign-ins can use your fingerprint, Face ID, or device biometrics instead of typing your password.",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.securityTitle",
    "thai_text": "ความปลอดภัยของบัญชี",
    "english_text": "Account security",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.signOut",
    "thai_text": "ออกจากระบบ",
    "english_text": "Sign out",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.summary",
    "thai_text": "หน้าสรุปยอด",
    "english_text": "Settlement page",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.summaryHint",
    "thai_text": "ตั้งงบรอบและกดเข้าไปดูรายละเอียด settlement ของแต่ละรอบได้จากหน้านี้",
    "english_text": "Set each cycle budget and open that cycle for detailed settlement",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.typePresets",
    "thai_text": "ประเภทรายการ",
    "english_text": "Transaction type presets",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.typePresetsHint",
    "thai_text": "เพิ่ม ลบ หรือแก้ชื่อประเภทที่ใช้ในหน้าสร้างธุรกรรมได้ โดยระบบยังคง behavior หลักแบบอาหารหรือค่าใช้จ่ายทั่วไป",
    "english_text": "Add, remove, or rename the transaction types shown in the transaction form while keeping the core system behavior mapped to food or normal expense.",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "app/settings/page.tsx.settingsCopy.updatePassword",
    "thai_text": "บันทึกรหัสผ่านใหม่",
    "english_text": "Save new password",
    "source_file": "app/settings/page.tsx",
    "notes": null
  },
  {
    "translation_key": "attach",
    "thai_text": "แนบไฟล์",
    "english_text": "Attach",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "budgetAvailable",
    "thai_text": "งบทั้งหมด",
    "english_text": "Budget available",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "carryOver",
    "thai_text": "ยอดยกไป",
    "english_text": "Carry over",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryBills",
    "thai_text": "บิลและค่าสาธารณูปโภค",
    "english_text": "Bills",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryEntertainment",
    "thai_text": "บันเทิง",
    "english_text": "Entertainment",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryFood",
    "thai_text": "อาหาร",
    "english_text": "Food",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryHealth",
    "thai_text": "สุขภาพ",
    "english_text": "Health",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryInvestment",
    "thai_text": "การลงทุน",
    "english_text": "Investment",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryMix",
    "thai_text": "สัดส่วนหมวดหมู่",
    "english_text": "Category mix",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryOther",
    "thai_text": "อื่น ๆ",
    "english_text": "Other",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryShopping",
    "thai_text": "ช้อปปิ้ง",
    "english_text": "Shopping",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "categoryTransport",
    "thai_text": "เดินทาง",
    "english_text": "Transport",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "continueWithGoogle",
    "thai_text": "เข้าสู่ระบบด้วย Google",
    "english_text": "Continue with Google",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "createInstallment",
    "thai_text": "สร้างผ่อนชำระ",
    "english_text": "Create installment",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "currentInstallment",
    "thai_text": "งวดปัจจุบัน",
    "english_text": "Current installment",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "cycleDaysLeft",
    "thai_text": "วันในรอบที่เหลือ",
    "english_text": "Cycle days left",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "dashboard",
    "thai_text": "แดชบอร์ด",
    "english_text": "Dashboard",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "date",
    "thai_text": "วันที่",
    "english_text": "Date",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "daysLeft",
    "thai_text": "วันคงเหลือ",
    "english_text": "days left",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "endDate",
    "thai_text": "วันสิ้นสุด",
    "english_text": "End date",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.installmentCardHint",
    "thai_text": "กดการ์ดเพื่อดูรายการผ่อนของรอบบิลนี้ทั้งหมด",
    "english_text": "Tap the card to see all installment items in this billing cycle.",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.installmentCardLabel",
    "thai_text": "รายการผ่อนเดือนนี้",
    "english_text": "Installments this cycle",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.installmentListTitle",
    "thai_text": "รายการผ่อนรอบนี้",
    "english_text": "Installments this cycle",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.installmentTotalLabel",
    "thai_text": "ยอดรวมผ่อนรอบนี้",
    "english_text": "Total installments this cycle",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.noInstallmentTransactions",
    "thai_text": "ยังไม่มีรายการผ่อนในรอบนี้",
    "english_text": "No installments in this cycle",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.noOtherTransactions",
    "thai_text": "ยังไม่มีรายการค่าใช้จ่ายอื่นในรอบนี้",
    "english_text": "No other transactions in this cycle",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.otherExpenseHint",
    "thai_text": "กดการ์ดเพื่อดูรายการค่าใช้จ่ายอื่นทั้งหมดของรอบนี้",
    "english_text": "Tap the card to see all other transactions in this cycle.",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.otherExpenseListTitle",
    "thai_text": "รายการค่าใช้จ่ายอื่นรอบนี้",
    "english_text": "Other transactions this cycle",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/dashboard/dashboard-page.tsx.otherExpenseTotalLabel",
    "thai_text": "ยอดรวมค่าใช้จ่ายอื่นรอบนี้",
    "english_text": "Total other spending this cycle",
    "source_file": "features/dashboard/dashboard-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.cancelEdit",
    "thai_text": "ยกเลิกการแก้ไข",
    "english_text": "Cancel edit",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.createTitle",
    "thai_text": "สร้างผ่อนชำระ",
    "english_text": "Create installment",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.delete",
    "thai_text": "ลบ",
    "english_text": "Delete",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.deleteConfirm",
    "thai_text": "ลบรายการผ่อนนี้ใช่ไหม",
    "english_text": "Delete this installment?",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.deleteFailed",
    "thai_text": "ลบรายการผ่อนไม่สำเร็จ",
    "english_text": "Failed to delete installment",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.edit",
    "thai_text": "แก้ไข",
    "english_text": "Edit",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.editingBadge",
    "thai_text": "กำลังแก้ไข",
    "english_text": "Editing",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.editTitle",
    "thai_text": "แก้ไขผ่อนชำระ",
    "english_text": "Edit installment",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.saveFailed",
    "thai_text": "บันทึกรายการผ่อนไม่สำเร็จ",
    "english_text": "Failed to save installment",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.subtitle",
    "thai_text": "ติดตามค่างวดที่สร้างรายการรายเดือนอัตโนมัติ และแก้ไขหรือลบรายการที่ลงผิดได้",
    "english_text": "Track recurring installment payments and fix mistakes by editing or deleting them.",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.update",
    "thai_text": "บันทึกการแก้ไข",
    "english_text": "Save changes",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/installments/installments-page.tsx.installmentsCopy.updateFailed",
    "thai_text": "แก้ไขรายการผ่อนไม่สำเร็จ",
    "english_text": "Failed to update installment",
    "source_file": "features/installments/installments-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.line_315",
    "thai_text": "OCR ไม่สำเร็จ กรุณาลองอัปโหลดใหม่หรือแก้ข้อมูลเอง",
    "english_text": "OCR failed. Please try again or fill the data manually.",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.addRow",
    "thai_text": "เพิ่มบรรทัด",
    "english_text": "Add row",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.attachOriginal",
    "thai_text": "แนบรูปต้นฉบับไปกับทุกรายการ",
    "english_text": "Attach the original image to every transaction",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.autoSplitHint",
    "thai_text": "เลือกประเภทและการหารก่อนยืนยันได้",
    "english_text": "You can adjust transaction type and split rule before saving.",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.confirmSave",
    "thai_text": "ยืนยันและบันทึก",
    "english_text": "Confirm and save",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.destinationAccount",
    "thai_text": "บัญชีปลายทาง",
    "english_text": "Destination account",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.destinationName",
    "thai_text": "ชื่อผู้รับ",
    "english_text": "Recipient name",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.detectedLines",
    "thai_text": "รายการที่ OCR แยกได้",
    "english_text": "OCR line candidates",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.documentType",
    "thai_text": "ประเภทเอกสาร",
    "english_text": "Document type",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.extractedTitle",
    "thai_text": "ข้อมูลที่อ่านได้",
    "english_text": "Extracted fields",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.fallbackTitle",
    "thai_text": "รายการจากการสแกน",
    "english_text": "Scanned item",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.fee",
    "thai_text": "ค่าธรรมเนียม",
    "english_text": "Fee",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.fillMissing",
    "thai_text": "ช่องที่เว้นว่างสามารถพิมพ์แก้เองได้",
    "english_text": "Blank fields are intentional so you can correct them manually.",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.includeRow",
    "thai_text": "รวมบรรทัดนี้",
    "english_text": "Include this row",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.invalidSelection",
    "thai_text": "กรุณาเลือกอย่างน้อย 1 บรรทัดที่มีชื่อและจำนวนเงิน",
    "english_text": "Select at least one row with a title and amount.",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.lineItemsTitle",
    "thai_text": "รายการที่จะแตกเป็นบรรทัด",
    "english_text": "Line items to save",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.lineNote",
    "thai_text": "หมายเหตุ",
    "english_text": "Note",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.merchant",
    "thai_text": "ร้าน/ปลายทาง",
    "english_text": "Store / destination",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.noLines",
    "thai_text": "ยังไม่มีรายการที่พร้อมบันทึก",
    "english_text": "No valid rows yet",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.paymentMethod",
    "thai_text": "วิธีจ่าย",
    "english_text": "Payment method",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.quantity",
    "thai_text": "จำนวน",
    "english_text": "Qty",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.rawTextTitle",
    "thai_text": "ข้อความ OCR ดิบ",
    "english_text": "Raw OCR text",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.receipt",
    "thai_text": "ใบเสร็จ",
    "english_text": "Receipt",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.reference",
    "thai_text": "เลขอ้างอิง",
    "english_text": "Reference",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.reviewTitle",
    "thai_text": "ตรวจสอบก่อนยืนยัน",
    "english_text": "Review before confirming",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.saveFailed",
    "thai_text": "บันทึกข้อมูลจากการสแกนไม่สำเร็จ",
    "english_text": "Failed to save scanned transactions",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.saveSuccess",
    "thai_text": "บันทึกรายการจากการสแกนเรียบร้อย",
    "english_text": "Saved scanned transactions",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.saving",
    "thai_text": "กำลังบันทึก...",
    "english_text": "Saving...",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.selectedTotal",
    "thai_text": "ยอดรวมที่เลือก",
    "english_text": "Selected total",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.sharedTitle",
    "thai_text": "ข้อมูลหลัก",
    "english_text": "Shared details",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.sourceAccount",
    "thai_text": "บัญชีต้นทาง",
    "english_text": "Source account",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.sourceLine",
    "thai_text": "บรรทัดต้นฉบับ",
    "english_text": "Source line",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.sourceName",
    "thai_text": "ชื่อผู้โอน",
    "english_text": "Sender name",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.time",
    "thai_text": "เวลา",
    "english_text": "Time",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.title",
    "thai_text": "ชื่อรายการหลัก",
    "english_text": "Primary title",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.transfer",
    "thai_text": "สลิปโอนเงิน",
    "english_text": "Transfer slip",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.uploadHint",
    "thai_text": "รองรับ JPG, PNG และ WebP",
    "english_text": "Supports JPG, PNG, and WebP",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.uploadImage",
    "thai_text": "อัปโหลดรูป",
    "english_text": "Upload image",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.uploadSubtitle",
    "thai_text": "หลัง OCR จะแตกเป็นรายการให้ตรวจทีละบรรทัด ช่องไหนหาไม่เจอจะปล่อยว่างไว้ให้แก้ก่อนยืนยัน",
    "english_text": "After OCR, we break the document into editable rows. Missing fields stay blank so you can review them before confirming.",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/scan/scan-page.tsx.scanCopy.uploadTitle",
    "thai_text": "สแกนสลิปหรือใบเสร็จ",
    "english_text": "Scan slip or receipt",
    "source_file": "features/scan/scan-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-detail-page.tsx.detailCopy.back",
    "thai_text": "กลับไปหน้ารวม",
    "english_text": "Back to settlements",
    "source_file": "features/settlement/settlement-detail-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-detail-page.tsx.detailCopy.loadFailed",
    "thai_text": "โหลดรายละเอียดสรุปยอดไม่สำเร็จ",
    "english_text": "Failed to load settlement detail",
    "source_file": "features/settlement/settlement-detail-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-detail-page.tsx.detailCopy.loading",
    "thai_text": "กำลังโหลด...",
    "english_text": "Loading...",
    "source_file": "features/settlement/settlement-detail-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-detail-page.tsx.detailCopy.notFound",
    "thai_text": "ไม่พบรอบบิลนี้",
    "english_text": "Cycle not found",
    "source_file": "features/settlement/settlement-detail-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-detail-page.tsx.detailCopy.transferResult",
    "thai_text": "หลังหักลบ",
    "english_text": "After offset",
    "source_file": "features/settlement/settlement-detail-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.budgetColumn",
    "thai_text": "งบรวม",
    "english_text": "Budget",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.cycleColumn",
    "thai_text": "Billing cycle",
    "english_text": "Billing cycle",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.empty",
    "thai_text": "ยังไม่มีรอบบิล",
    "english_text": "No billing cycles yet",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.loadFailed",
    "thai_text": "โหลดข้อมูลสรุปยอดไม่สำเร็จ",
    "english_text": "Failed to load settlements",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.loading",
    "thai_text": "กำลังโหลด...",
    "english_text": "Loading...",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.open",
    "thai_text": "ดูรายละเอียด",
    "english_text": "Open",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.subtitle",
    "thai_text": "เลือกเดือนก่อน แล้วค่อยกดเข้าไปดูรายละเอียดของรอบนั้น",
    "english_text": "Start from month/year, then open a cycle to inspect the details.",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.title",
    "thai_text": "สรุปยอด",
    "english_text": "Settlement",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.updated",
    "thai_text": "บันทึกงบรอบนี้แล้ว",
    "english_text": "Budget updated",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/settlement/settlement-page.tsx.settlementCopy.updateFailed",
    "thai_text": "อัปเดตงบรอบบิลไม่สำเร็จ",
    "english_text": "Failed to update cycle budget",
    "source_file": "features/settlement/settlement-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.line_274",
    "thai_text": "ยืนยันการรีเซ็ตข้อมูลในฟอร์มนี้?",
    "english_text": "Reset all current form rows?",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.addRow",
    "thai_text": "เพิ่มแถว",
    "english_text": "Add row",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.addTitle",
    "thai_text": "สร้างหลายธุรกรรม",
    "english_text": "Create multiple transactions",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.attachmentFailed",
    "thai_text": "อัปโหลดไฟล์แนบไม่สำเร็จ",
    "english_text": "Failed to upload attachment",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.cancelEdit",
    "thai_text": "ยกเลิกการแก้ไข",
    "english_text": "Cancel edit",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.delete",
    "thai_text": "ลบ",
    "english_text": "Delete",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.deleteConfirm",
    "thai_text": "ลบรายการนี้ใช่ไหม",
    "english_text": "Delete this transaction?",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.deleteFailed",
    "thai_text": "ลบรายการไม่สำเร็จ",
    "english_text": "Failed to delete transaction",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.edit",
    "thai_text": "แก้ไข",
    "english_text": "Edit",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.editingBadge",
    "thai_text": "กำลังแก้ไข",
    "english_text": "Editing",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.editTitle",
    "thai_text": "แก้ไขธุรกรรม",
    "english_text": "Edit transaction",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.lockedInstallment",
    "thai_text": "รายการผ่อนชำระ ให้จัดการจากหน้าผ่อนชำระ",
    "english_text": "Manage installment transactions from the Installments page",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.openAttachment",
    "thai_text": "เปิดไฟล์แนบ",
    "english_text": "Open attachment",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.removeRow",
    "thai_text": "ลบแถว",
    "english_text": "Remove row",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.reset",
    "thai_text": "Reset",
    "english_text": "Reset",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.rowLabel",
    "thai_text": "รายการ",
    "english_text": "Item",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.saveAll",
    "thai_text": "บันทึกทั้งหมด",
    "english_text": "Save all",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.saveFailed",
    "thai_text": "บันทึกรายการไม่สำเร็จ",
    "english_text": "Failed to save transactions",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.selectedFile",
    "thai_text": "ไฟล์แนบ",
    "english_text": "Attachment",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.subtitle",
    "thai_text": "เพิ่มหลายรายการในครั้งเดียวได้ และแก้ไขหรือลบรายการที่ลงผิดจากรายการด้านขวา",
    "english_text": "Create several entries at once, then edit or delete mistakes from the list on the right.",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.typeLabel",
    "thai_text": "ประเภทรายการ",
    "english_text": "Transaction type",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.update",
    "thai_text": "บันทึกการแก้ไข",
    "english_text": "Save changes",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "features/transactions/transactions-page.tsx.transactionsCopy.updateFailed",
    "thai_text": "แก้ไขรายการไม่สำเร็จ",
    "english_text": "Failed to update transaction",
    "source_file": "features/transactions/transactions-page.tsx",
    "notes": null
  },
  {
    "translation_key": "finalSettlement",
    "thai_text": "ยอดโอนสุทธิ",
    "english_text": "Final settlement",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "foodRemaining",
    "thai_text": "ค่าอาหารคงเหลือ",
    "english_text": "Food remaining",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "foodSpent",
    "thai_text": "ค่าอาหารที่ใช้",
    "english_text": "Food spent",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "fullReimburse",
    "thai_text": "คืนเต็มจำนวน",
    "english_text": "Full reimburse",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "givesTo",
    "thai_text": "ให้",
    "english_text": "to",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "googleOAuth",
    "thai_text": "Google OAuth จัดการผ่าน Supabase Auth",
    "english_text": "Google OAuth is handled by Supabase Auth.",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "grossSummary",
    "thai_text": "ยอดก่อนหักลบ",
    "english_text": "Gross summary",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "hideItems",
    "thai_text": "ย่อรายการ",
    "english_text": "Hide items",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "household",
    "thai_text": "คู่ของคุณ",
    "english_text": "Household",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "householdDescription",
    "thai_text": "FlowPay ตั้งใจออกแบบสำหรับผู้ใช้ 2 คน กำหนด Google OAuth, profiles และ RLS ใน Supabase",
    "english_text": "FlowPay is intentionally scoped to two users. Configure Google OAuth, profiles, and RLS in Supabase.",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "incomingSide",
    "thai_text": "อีกฝั่งต้องให้",
    "english_text": "Incoming",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "installmentOverview",
    "thai_text": "ภาพรวมผ่อนชำระ",
    "english_text": "Installment overview",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "installments",
    "thai_text": "ผ่อนชำระ",
    "english_text": "Installments",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "installmentSubtitle",
    "thai_text": "ติดตามค่างวดที่สร้างรายการรายเดือนอัตโนมัติ",
    "english_text": "Auto-generated monthly payment tracking",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "installmentTitle",
    "thai_text": "ชื่อรายการผ่อน",
    "english_text": "Installment title",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "invalidFile",
    "thai_text": "ไฟล์ไม่ถูกต้อง",
    "english_text": "Invalid file",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "items",
    "thai_text": "รายการ",
    "english_text": "items",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "latestTransactions",
    "thai_text": "รายการล่าสุด",
    "english_text": "Latest transactions",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "monthlyAmount",
    "thai_text": "ยอดต่องวด",
    "english_text": "Monthly amount",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "monthlySettlement",
    "thai_text": "สรุปรายรอบ",
    "english_text": "Monthly settlement",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "netTransfer",
    "thai_text": "ยอดโอนสุทธิ",
    "english_text": "Net transfer",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "new",
    "thai_text": "ใหม่",
    "english_text": "New",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "nextContributionPerUser",
    "thai_text": "เติมรอบถัดไป / คน",
    "english_text": "Next contribution / user",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "noItems",
    "thai_text": "ไม่มีรายการ",
    "english_text": "No items",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "noSplit",
    "thai_text": "ส่วนตัว ไม่หาร",
    "english_text": "No split",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "ocrFailed",
    "thai_text": "OCR ไม่สำเร็จ กรุณากรอกเอง",
    "english_text": "OCR failed. Please enter details manually.",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "outgoingSide",
    "thai_text": "ฝั่งนี้ต้องให้",
    "english_text": "Outgoing",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "owes",
    "thai_text": "ต้องคืน",
    "english_text": "owes",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "paid",
    "thai_text": "จ่ายโดย",
    "english_text": "paid",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "paidProgress",
    "thai_text": "จ่ายแล้ว",
    "english_text": "paid",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "reasonFoodBudgetOverrun",
    "thai_text": "ค่าอาหารเกินงบรอบนี้",
    "english_text": "Food budget overrun",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "reasonFoodPaidByNonHolder",
    "thai_text": "ค่าอาหารที่จ่ายโดยคนที่ไม่ได้ถือกระเป๋า",
    "english_text": "Food paid by non-holder",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "reasonFullReimbursement",
    "thai_text": "คืนเต็มจำนวน",
    "english_text": "Full reimbursement",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "reasonNextCycleFoodContribution",
    "thai_text": "เงินเติมค่าอาหารรอบถัดไป",
    "english_text": "Next cycle food contribution",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "reasonSharedExpense",
    "thai_text": "ค่าใช้จ่ายร่วม",
    "english_text": "Shared expense",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "reasonSharedInstallment",
    "thai_text": "ผ่อนชำระแบบหารร่วม",
    "english_text": "Shared installment",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "recommendedToday",
    "thai_text": "แนะนำใช้วันนี้",
    "english_text": "Recommended today",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "remainingBudget",
    "thai_text": "งบคงเหลือ",
    "english_text": "Remaining budget",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "reviewExtractedDetails",
    "thai_text": "ตรวจข้อมูลที่อ่านได้",
    "english_text": "Review extracted details",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "save",
    "thai_text": "บันทึก",
    "english_text": "Save",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "saveTransaction",
    "thai_text": "บันทึกรายการ",
    "english_text": "Save transaction",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "scan",
    "thai_text": "สแกน",
    "english_text": "Scan",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "scanReceipt",
    "thai_text": "สแกนใบเสร็จ",
    "english_text": "Scan receipt",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "scanSubtitle",
    "thai_text": "OCR ภาษาไทยและอังกฤษด้วย Tesseract.js",
    "english_text": "Thai and English OCR using Tesseract.js",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "settings",
    "thai_text": "ตั้งค่า",
    "english_text": "Settings",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "settlement",
    "thai_text": "สรุปยอด",
    "english_text": "Settlement",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "settlementIncludes",
    "thai_text": "รวมค่าอาหารที่ต้องคืน ค่าใช้จ่ายร่วม และผ่อนชำระ",
    "english_text": "Includes food reimbursements, shared expenses, and installments.",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "settlementLedger",
    "thai_text": "บัญชีสรุปยอด",
    "english_text": "Settlement ledger",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "sharedFoodWallet",
    "thai_text": "กระเป๋าอาหารร่วม",
    "english_text": "Shared food wallet",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "showItems",
    "thai_text": "แสดงรายการ",
    "english_text": "Show items",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "signIn",
    "thai_text": "เข้าสู่ระบบ FlowPay",
    "english_text": "Sign in to FlowPay",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "spendingTrend",
    "thai_text": "แนวโน้มค่าใช้จ่าย",
    "english_text": "Spending trend",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "splitHalf",
    "thai_text": "หารครึ่ง",
    "english_text": "Split half",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "startDate",
    "thai_text": "วันเริ่ม",
    "english_text": "Start date",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "storeOrItem",
    "thai_text": "ร้านค้าหรือรายการ",
    "english_text": "Store or item",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "title",
    "thai_text": "ชื่อรายการ",
    "english_text": "Title",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "toggleLanguage",
    "thai_text": "เปลี่ยนภาษา",
    "english_text": "Change language",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "toggleTheme",
    "thai_text": "เปลี่ยนธีม",
    "english_text": "Toggle theme",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "totalInstallments",
    "thai_text": "จำนวนงวดทั้งหมด",
    "english_text": "Total installments",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "transactions",
    "thai_text": "ธุรกรรม",
    "english_text": "Transactions",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "transactionSubtitle",
    "thai_text": "เพิ่มเฉพาะค่าอาหารหรือค่าใช้จ่ายทั่วไป",
    "english_text": "Add food or normal expenses only",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "transferResult",
    "thai_text": "หลังหักลบ",
    "english_text": "After offset",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "transfers",
    "thai_text": "โอนให้",
    "english_text": "transfers",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "typeFood",
    "thai_text": "ค่าอาหาร",
    "english_text": "Food",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "typeInstallment",
    "thai_text": "ผ่อนชำระ",
    "english_text": "Installment",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "typeNormal",
    "thai_text": "ค่าใช้จ่ายทั่วไป",
    "english_text": "Normal expense",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "uploadImage",
    "thai_text": "อัปโหลดรูป",
    "english_text": "Upload image",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  },
  {
    "translation_key": "utils/installments.ts.line_30",
    "thai_text": "งวดผ่อน",
    "english_text": "Installment",
    "source_file": "utils/installments.ts",
    "notes": null
  },
  {
    "translation_key": "walletHolder",
    "thai_text": "ผู้ถือกระเป๋า",
    "english_text": "Wallet holder",
    "source_file": "i18n/dictionary.ts",
    "notes": null
  }
]$json$::jsonb) as x(
    translation_key text,
    thai_text text,
    english_text text,
    source_file text,
    notes text
  )
)
insert into public.translation_pairs (translation_key, thai_text, english_text, source_file, notes)
select translation_key, thai_text, english_text, source_file, notes
from seed
on conflict (translation_key) do update set
  thai_text = excluded.thai_text,
  english_text = excluded.english_text,
  source_file = excluded.source_file,
  notes = excluded.notes,
  updated_at = now();
