"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function UnlockPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      setLoading(false);
      setError("รหัสบ้านไม่ถูกต้อง");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center">
      <Card className="w-full">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black">ปลดล็อกบ้าน</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">ใส่รหัสบ้านเพื่อเข้าใช้งาน FlowPay ชุดนี้</p>
          </div>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Field label="รหัสบ้าน">
            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="เช่น 2500" />
          </Field>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            เข้าแอป
          </Button>
        </form>
      </Card>
    </div>
  );
}
