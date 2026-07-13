import { createAdminClient } from "@/services/supabase/admin";
import { sendPushToSubscriptions } from "@/services/notifications/web-push";

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  title: string;
  body: string;
  transaction_id: string | null;
};

type FallbackNotificationRow = NotificationRow & {
  transaction_id: string;
};

function formatNotificationAmount(value: number) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

async function buildFallbackNotifications(transactionIds: string[]) {
  const supabase = createAdminClient();
  const [{ data: transactions, error: transactionsError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from("transactions").select("id,title,amount,payer_user_id").in("id", transactionIds),
    supabase.from("profiles").select("id,display_name")
  ]);

  if (transactionsError || profilesError || !transactions?.length || !profiles?.length) {
    if (transactionsError) {
      console.error("Failed to load transactions for fallback push dispatch", transactionsError);
    }

    if (profilesError) {
      console.error("Failed to load profiles for fallback push dispatch", profilesError);
    }

    return [] as FallbackNotificationRow[];
  }

  return transactions
    .map((transaction) => {
      const actor = profiles.find((profile) => profile.id === transaction.payer_user_id);
      const recipient = profiles.find((profile) => profile.id !== transaction.payer_user_id);

      if (!recipient) {
        return null;
      }

      return {
        id: transaction.id,
        recipient_user_id: recipient.id,
        actor_user_id: transaction.payer_user_id,
        title: "New transaction",
        body: `${actor?.display_name ?? "Partner"} added ${transaction.title} ${formatNotificationAmount(Number(transaction.amount))} THB`,
        transaction_id: transaction.id
      } satisfies FallbackNotificationRow;
    })
    .filter((row): row is FallbackNotificationRow => row !== null);
}

export async function dispatchPushNotificationsForTransactions(transactionIds: string[]) {
  if (!transactionIds.length) return;

  const supabase = createAdminClient();
  const { data: notificationRows, error: notificationsError } = await supabase
    .from("notifications")
    .select("id,recipient_user_id,title,body,transaction_id")
    .in("transaction_id", transactionIds);

  if (notificationsError) {
    console.error("Failed to load notifications for push dispatch", notificationsError);
  }

  const resolvedNotificationRows = notificationRows?.length ? notificationRows : await buildFallbackNotifications(transactionIds);

  if (!resolvedNotificationRows.length) {
    if (notificationsError) {
      console.error("Push dispatch skipped because no notifications were available");
    }
    return;
  }

  const recipientIds = Array.from(new Set(resolvedNotificationRows.map((row) => row.recipient_user_id)));
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

  for (const notification of resolvedNotificationRows) {
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
