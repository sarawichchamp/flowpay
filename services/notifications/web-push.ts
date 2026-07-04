import webpush from "web-push";
import type { Database } from "@/types/database";

type PushSubscriptionRow = Database["public"]["Tables"]["push_subscriptions"]["Row"];

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let vapidConfigured = false;

export function isWebPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function ensureWebPushConfigured() {
  if (vapidConfigured || !isWebPushConfigured()) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? ""
  );

  vapidConfigured = true;
}

export async function sendPushToSubscriptions(subscriptions: PushSubscriptionRow[], payload: PushPayload) {
  if (!subscriptions.length || !isWebPushConfigured()) {
    return { staleSubscriptionIds: [] as string[] };
  }

  ensureWebPushConfigured();

  const staleSubscriptionIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: null,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          JSON.stringify(payload)
        );
      } catch (error: unknown) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : null;
        if (statusCode === 404 || statusCode === 410) {
          staleSubscriptionIds.push(subscription.id);
          return;
        }

        console.error("Failed to send web push notification", error);
      }
    })
  );

  return { staleSubscriptionIds };
}
