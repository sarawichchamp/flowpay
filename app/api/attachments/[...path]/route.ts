import { NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/admin";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const { path } = await params;
  const objectPath = path.join("/");
  if (!objectPath) {
    return NextResponse.json({ error: "Attachment path is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("attachments").createSignedUrl(objectPath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Failed to open attachment" }, { status: 400 });
  }

  return NextResponse.redirect(data.signedUrl);
}
