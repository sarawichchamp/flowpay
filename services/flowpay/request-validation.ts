import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ZodError, type ZodType } from "zod";
import type { Database } from "@/types/database";

export async function parseJsonWithSchema<T>(request: Request, schema: ZodType<T>) {
  try {
    const body = await request.json();
    return { data: schema.parse(body), error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: error.issues[0]?.message ?? "Invalid request body"
          },
          { status: 400 }
        )
      };
    }

    return {
      data: null,
      error: NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    };
  }
}

export async function getHouseholdProfileIds(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("profiles").select("id").order("created_at", { ascending: true }).limit(2);
  if (error) throw error;
  return new Set(data.map((profile) => profile.id));
}

export async function ensureBillingCycleExists(supabase: SupabaseClient<Database>, billingCycleId: string) {
  const { data, error } = await supabase.from("billing_cycles").select("id").eq("id", billingCycleId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
