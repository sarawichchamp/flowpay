import { createAdminClient } from "@/services/supabase/admin";
import { sendPushToSubscriptions } from "@/services/notifications/web-push";

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  title: string;
  body: string;
  transaction_id: string | null;
};

export async function dispatchPushNotificationsForTransactions(transactionIds: string[]) {
  if (!transactionIds.length) return;

  const supabase = createAdminClient();
  const { data: notificationRows, error: notificationsError } = await supabase
    .from("notifications")
    .select("id,recipient_user_id,title,body,transaction_id")
    .in("transaction_id", transactionIds);

  if (notificationsError || !notificationRows?.length) {
    if (notificationsError) {
      console.error("Failed to load notifications for push dispatch", notificationsError);
    }
    return;
  }

  const recipientIds = Array.from(new Set(notificationRows.map((row) => row.recipient_user_id)));
  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", recipientIds);

  if (subscriptionsError || !subscriptions?.length) {
    if (subscriptionsError) {
      console.error("Failed to load push subscriptions", subscriptionsError);
    }
    return;
  }

  const subscriptionsByUserId = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions) {
    const current = subscriptionsByUserId.get(subscription.user_id) ?? [];
    current.push(subscription);
    subscriptionsByUserId.set(subscription.user_id, current);
  }

  const staleSubscriptionIds = new Set<string>();

  for (const notification of notificationRows as NotificationRow[]) {
    const recipientSubscriptions = subscriptionsByUserId.get(notification.recipient_user_id) ?? [];
    if (!recipientSubscriptions.length) continue;

    const { staleSubscriptionIds: staleIds } = await sendPushToSubscriptions(recipientSubscriptions, {
      title: notification.title,
      body: notification.body,
      url: "/transactions",
      tag: notification.transaction_id ?? notification.id
    });

    staleIds.forEach((id) => staleSubscriptionIds.add(id));
  }

  if (staleSubscriptionIds.size) {
    await supabase.from("push_subscriptions").delete().in("id", Array.from(staleSubscriptionIds));
  }
}
