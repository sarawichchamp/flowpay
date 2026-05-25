import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function subscribeToNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  onNotification: (payload: Database["public"]["Tables"]["notifications"]["Row"]) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_user_id=eq.${userId}`
      },
      (payload) => onNotification(payload.new as Database["public"]["Tables"]["notifications"]["Row"])
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
