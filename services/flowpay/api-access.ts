import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppMode } from "@/services/flowpay/app-mode";
import { getHouseholdAccessCode, householdAccessCookieName, isHouseholdAccessConfigured } from "@/services/flowpay/access";

export async function requireHouseholdApiAccess() {
  if (getAppMode() !== "production" || !isHouseholdAccessConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(householdAccessCookieName)?.value;
  const configuredCode = getHouseholdAccessCode();

  if (!accessCookie || !configuredCode || accessCookie !== configuredCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
