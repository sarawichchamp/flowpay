import { getAppMode, isSupabaseDemoMode } from "@/services/flowpay/app-mode";
import { requireAuthenticatedHouseholdApiAccess } from "@/services/flowpay/auth";

export async function requireHouseholdApiAccess() {
  if (getAppMode() !== "production") {
    return null;
  }

  if (isSupabaseDemoMode()) {
    return null;
  }

  return requireAuthenticatedHouseholdApiAccess();
}
