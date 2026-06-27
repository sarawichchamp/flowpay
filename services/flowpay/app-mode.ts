import { isSupabaseAdminConfigured } from "@/services/supabase/admin";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export type AppMode = "demo" | "production";

export function isSupabaseDemoMode() {
  return process.env.NODE_ENV !== "production" && process.env.FLOWPAY_SUPABASE_DEMO === "1";
}

export function getAppMode(): AppMode {
  const configuredMode = process.env.FLOWPAY_APP_MODE;
  if (configuredMode === "demo" || configuredMode === "production") {
    return configuredMode;
  }

  if (isSupabaseDemoMode()) {
    return isSupabaseConfigured() && isSupabaseAdminConfigured() ? "production" : "demo";
  }

  if (process.env.NODE_ENV !== "production") {
    return "demo";
  }

  return isSupabaseConfigured() && isSupabaseAdminConfigured() ? "production" : "demo";
}
