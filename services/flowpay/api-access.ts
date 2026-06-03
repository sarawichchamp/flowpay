import { getAppMode } from "@/services/flowpay/app-mode";
import { requireAuthenticatedHouseholdApiAccess } from "@/services/flowpay/auth";

export async function requireHouseholdApiAccess() {
  if (getAppMode() !== "production") {
    return null;
  }

  return requireAuthenticatedHouseholdApiAccess();
}
