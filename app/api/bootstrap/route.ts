import { NextResponse } from "next/server";
import { getFlowPayBootstrap } from "@/services/flowpay/bootstrap";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const bootstrap = await getFlowPayBootstrap();
  return NextResponse.json(bootstrap);
}
