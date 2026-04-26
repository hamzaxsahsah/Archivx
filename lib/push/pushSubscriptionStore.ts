import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { PushSubscription } from "web-push";
import { adminDb } from "@/lib/firebaseAdmin";

const COL = "webPushSubscriptions";

export function endpointDocId(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

export type ClientPushSubscriptionJson = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: { p256dh: string; auth: string };
};

export async function upsertPushSubscription(
  firebaseUid: string,
  sub: ClientPushSubscriptionJson,
): Promise<void> {
  if (!sub.endpoint || !sub.keys?.auth || !sub.keys?.p256dh) {
    throw new Error("Invalid subscription");
  }
  const id = endpointDocId(sub.endpoint);
  await adminDb()
    .collection(COL)
    .doc(id)
    .set(
      {
        firebaseUid,
        endpoint: sub.endpoint,
        keys: sub.keys,
        expirationTime: sub.expirationTime ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  try {
    await adminDb().collection(COL).doc(endpointDocId(endpoint)).delete();
  } catch {
    /* ignore */
  }
}

/** Removes a subscription only if it belongs to the given user (for client unsubscribe). */
export async function deletePushSubscriptionForUser(endpoint: string, firebaseUid: string): Promise<void> {
  const ref = adminDb().collection(COL).doc(endpointDocId(endpoint));
  const snap = await ref.get();
  if (!snap.exists) return;
  if ((snap.data()?.firebaseUid as string | undefined) !== firebaseUid) return;
  await ref.delete();
}

export async function deletePushSubscriptionsForUser(firebaseUid: string): Promise<void> {
  const snap = await adminDb().collection(COL).where("firebaseUid", "==", firebaseUid).get();
  if (snap.empty) return;
  const CHUNK = 400;
  for (let i = 0; i < snap.docs.length; i += CHUNK) {
    const batch = adminDb().batch();
    const slice = snap.docs.slice(i, i + CHUNK);
    for (const doc of slice) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

export async function getPushSubscriptionsForUser(firebaseUid: string): Promise<PushSubscription[]> {
  const snap = await adminDb().collection(COL).where("firebaseUid", "==", firebaseUid).get();
  const out: PushSubscription[] = [];
  for (const doc of snap.docs) {
    const x = doc.data() as {
      endpoint: string;
      expirationTime?: number | null;
      keys?: { auth: string; p256dh: string };
    };
    if (!x.endpoint || !x.keys?.auth || !x.keys?.p256dh) continue;
    out.push({
      endpoint: x.endpoint,
      expirationTime: x.expirationTime ?? null,
      keys: x.keys,
    });
  }
  return out;
}
