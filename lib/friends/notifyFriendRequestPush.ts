import type { PublicUserCard } from "@/lib/friends/friendsAdmin";
import { isWebPushConfigured, sendWebPushToUser } from "@/lib/push/sendWebPush";

/** Notifies `recipientUid` that `from` sent a friend request (best-effort; no-op if push not configured). */
export async function notifyFriendRequestReceived(
  recipientUid: string,
  from: PublicUserCard,
): Promise<void> {
  if (!isWebPushConfigured()) return;

  const name = from.displayName?.trim() || "Someone";
  const photo = from.photoURL?.trim();
  const iconOrImage =
    photo && /^https?:\/\//i.test(photo) ? photo : undefined;

  await sendWebPushToUser(recipientUid, {
    title: name,
    body: `Sent you a friend request\n\nOpen Friends to accept or decline.`,
    url: `/friends?from=${encodeURIComponent(from.uid)}`,
    tag: `friend-req-${from.uid}`,
    ...(iconOrImage ? { icon: iconOrImage, image: iconOrImage } : {}),
  });
}
