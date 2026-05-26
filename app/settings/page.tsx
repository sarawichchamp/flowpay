"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFlowPayStore } from "@/hooks/use-flowpay-store";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n/dictionary";
import type { TransactionTypePresetBaseType } from "@/types/domain";

function settingsCopy(locale: "th" | "en") {
  return locale === "th"
    ? {
        summary: "หน้าสรุปยอด",
        importHistory: "หน้าอัปโหลดข้อมูลเก่า",
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
        saveFailed: "กรุณาใส่ชื่อประเภทก่อนบันทึก"
      }
    : {
        summary: "Settlement page",
        importHistory: "Historical import page",
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
        saveFailed: "Enter a preset name before saving"
      };
}

export default function SettingsPage() {
  const { locale } = useLocale();
  const copy = settingsCopy(locale);
  const { transactionTypePresets, addTransactionTypePreset, updateTransactionTypePreset, deleteTransactionTypePreset } = useFlowPayStore();
  const [label, setLabel] = useState("");
  const [baseType, setBaseType] = useState<TransactionTypePresetBaseType>("normal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">{t(locale, "settings")}</h1>

      <Card>
        <h2 className="text-xl font-bold">{copy.typePresets}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.typePresetsHint}</p>

        <form className="mt-5 space-y-4" onSubmit={handlePresetSubmit}>
          <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr_auto]">
            <Field label={copy.presetName}>
              <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={copy.presetName} />
            </Field>
            <Field label={copy.presetBehavior}>
              <select
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-white/10"
                value={baseType}
                onChange={(event) => setBaseType(event.target.value as TransactionTypePresetBaseType)}
              >
                <option value="food">{copy.presetFood}</option>
                <option value="normal">{copy.presetNormal}</option>
              </select>
            </Field>
            <div className="flex items-end gap-2">
              <Button type="submit">
                <Plus className="h-4 w-4" />
                {editingId ? copy.savePreset : copy.addPreset}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetPresetForm}>
                  {copy.cancelEdit}
                </Button>
              ) : null}
            </div>
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </form>

        <div className="mt-5 space-y-3">
          {transactionTypePresets.length ? (
            transactionTypePresets.map((preset) => (
              <div key={preset.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <div>
                  <p className="font-semibold">{preset.label}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {preset.baseType === "food" ? copy.presetFood : copy.presetNormal}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => startEditingPreset(preset.id)}>
                    <Pencil className="h-4 w-4" />
                    {copy.editPreset}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="text-red-500" onClick={() => deleteTransactionTypePreset(preset.id)}>
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
      </Card>

      <Card>
        <div className="space-y-3">
          <Link href="/settlement" className="block rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <p className="font-semibold">{copy.summary}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.summaryHint}</p>
          </Link>
          <Link href="/import-history" className="block rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <p className="font-semibold">{copy.importHistory}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.importHint}</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
