import { NextResponse } from "next/server";
import { getConfiguredHouseholdMembers } from "@/services/flowpay/household-members";
import { createAdminClient } from "@/services/supabase/admin";
import { createClient } from "@/services/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export function isConfiguredHouseholdMemberEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  const members = getConfiguredHouseholdMembers();

  if (!normalizedEmail || !members) {
    return false;
  }

  return members.some((member) => member.email === normalizedEmail);
}

export async function isAuthenticatedHouseholdMember(userId: string, email?: string | null) {
  if (!isConfiguredHouseholdMemberEmail(email)) {
    return false;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("profiles").select("id").eq("id", userId).limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function requireAuthenticatedHouseholdApiAccess() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isMember = await isAuthenticatedHouseholdMember(user.id, user.email);

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
