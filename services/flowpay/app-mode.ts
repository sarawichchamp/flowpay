import { isHouseholdAccessConfigured } from "@/services/flowpay/access";
import { isSupabaseAdminConfigured } from "@/services/supabase/admin";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export type AppMode = "demo" | "production";

export function getAppMode(): AppMode {
  return isSupabaseConfigured() && isSupabaseAdminConfigured() && isHouseholdAccessConfigured()
    ? "production"
    : "demo";
}
