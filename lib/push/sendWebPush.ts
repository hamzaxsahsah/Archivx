import webpush from "web-push";
import {
  deletePushSubscriptionByEndpoint,
  getPushSubscriptionsForUser,
} from "@/lib/push/pushSubscriptionStore";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT ?? "mailto:achievhq@localhost";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(contact, pub, priv);
  vapidConfigured = true;
  return true;
}

export function isWebPushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type WebPushPayload = {
  title: string;
  body: string;
  /** App-internal path e.g. /games/730 or /friends?from=… */
  url: string;
  tag: string;
  /** Small icon — achievement art or profile photo */
  icon?: string;
  /** Large image — game banner or profile photo for expanded notifications */
  image?: string;
};

export async function sendWebPushToUser(
  firebaseUid: string,
  payload: WebPushPayload,
): Promise<void> {
  if (!isWebPushConfigured() || !ensureVapidConfigured()) return;
  const subs = await getPushSubscriptionsForUser(firebaseUid);
  if (subs.length === 0) return;
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body, { TTL: 86_400 });
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await deletePushSubscriptionByEndpoint(sub.endpoint);
        }
      }
    }),
  );
}
