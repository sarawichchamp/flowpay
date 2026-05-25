import { NextResponse } from "next/server";
import { getHouseholdAccessCode, householdAccessCookieName } from "@/services/flowpay/access";

export async function POST(request: Request) {
  const { code } = (await request.json()) as { code?: string };
  const configuredCode = getHouseholdAccessCode();

  if (!configuredCode || !code || code !== configuredCode) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(householdAccessCookieName, configuredCode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
