import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";
import { getAuthenticatedUser } from "@/services/flowpay/auth";
import { isWebPushConfigured } from "@/services/notifications/web-push";
import { createAdminClient } from "@/services/supabase/admin";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

const deleteSubscriptionSchema = z.object({
  endpoint: z.string().url()
});

export async function POST(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web push is not configured" }, { status: 503 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = pushSubscriptionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid subscription payload" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: request.headers.get("user-agent")
    },
    {
      onConflict: "endpoint"
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = deleteSubscriptionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid subscription payload" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", parsed.data.endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
