import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export function friendPairId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("__");
}

export type PublicUserCard = {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  steamLinked: boolean;
};

export async function getPublicUserCard(uid: string): Promise<PublicUserCard | null> {
  const snap = await adminDb().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  const d = snap.data() as {
    displayName?: string | null;
    photoURL?: string | null;
    steamId?: string | null;
  };
  return {
    uid,
    displayName: d.displayName ?? null,
    photoURL: d.photoURL ?? null,
    steamLinked: Boolean(d.steamId),
  };
}

export async function isFriend(uid: string, otherUid: string): Promise<boolean> {
  const snap = await adminDb().doc(`users/${uid}/friends/${otherUid}`).get();
  return snap.exists;
}

export async function listFriends(uid: string): Promise<PublicUserCard[]> {
  const col = await adminDb().collection(`users/${uid}/friends`).get();
  const out: PublicUserCard[] = [];
  for (const doc of col.docs) {
    const card = await getPublicUserCard(doc.id);
    if (card) out.push(card);
  }
  out.sort((a, b) => (a.displayName ?? a.uid).localeCompare(b.displayName ?? b.uid));
  return out;
}

export type RequestRow = PublicUserCard & { createdAt: number };

export async function listIncomingRequests(uid: string): Promise<RequestRow[]> {
  const col = await adminDb().collection(`users/${uid}/requests`).get();
  const out: RequestRow[] = [];
  for (const doc of col.docs) {
    const d = doc.data() as {
      displayName?: string | null;
      photoURL?: string | null;
      createdAt?: Timestamp;
    };
    const card = await getPublicUserCard(doc.id);
    out.push({
      uid: doc.id,
      displayName: d.displayName ?? card?.displayName ?? null,
      photoURL: d.photoURL ?? card?.photoURL ?? null,
      steamLinked: card?.steamLinked ?? false,
      createdAt: d.createdAt?.toMillis() ?? 0,
    });
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

export async function listOutgoingRequests(uid: string): Promise<RequestRow[]> {
  const col = await adminDb().collection(`users/${uid}/requestsSent`).get();
  const out: RequestRow[] = [];
  for (const doc of col.docs) {
    const d = doc.data() as { createdAt?: Timestamp };
    const card = await getPublicUserCard(doc.id);
    if (card)
      out.push({
        ...card,
        createdAt: d.createdAt?.toMillis() ?? 0,
      });
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

export async function sendFriendRequest(
  fromUid: string,
  toUid: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (fromUid === toUid) return { ok: false, reason: "SELF" };
  const target = await getPublicUserCard(toUid);
  if (!target) return { ok: false, reason: "NOT_FOUND" };
  if (await isFriend(fromUid, toUid)) return { ok: false, reason: "ALREADY_FRIENDS" };
  const incomingSnap = await adminDb().doc(`users/${toUid}/requests/${fromUid}`).get();
  if (incomingSnap.exists) return { ok: false, reason: "ALREADY_PENDING" };
  const reverseSnap = await adminDb().doc(`users/${fromUid}/requests/${toUid}`).get();
  if (reverseSnap.exists) return { ok: false, reason: "THEY_SHOULD_ACCEPT" };

  const fromCard = await getPublicUserCard(fromUid);
  if (!fromCard) return { ok: false, reason: "FROM_MISSING" };

  const batch = adminDb().batch();
  batch.set(adminDb().doc(`users/${toUid}/requests/${fromUid}`), {
    displayName: fromCard.displayName,
    photoURL: fromCard.photoURL,
    createdAt: Timestamp.now(),
  });
  batch.set(adminDb().doc(`users/${fromUid}/requestsSent/${toUid}`), {
    createdAt: Timestamp.now(),
  });
  await batch.commit();
  return { ok: true };
}

export async function respondToRequest(
  myUid: string,
  fromUid: string,
  accept: boolean,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const reqSnap = await adminDb().doc(`users/${myUid}/requests/${fromUid}`).get();
  if (!reqSnap.exists) return { ok: false, reason: "NO_REQUEST" };

  const batch = adminDb().batch();
  batch.delete(adminDb().doc(`users/${myUid}/requests/${fromUid}`));
  batch.delete(adminDb().doc(`users/${fromUid}/requestsSent/${myUid}`));

  if (accept) {
    const a = fromUid;
    const b = myUid;
    const since = Timestamp.now();
    const cardA = await getPublicUserCard(a);
    const cardB = await getPublicUserCard(b);
    if (!cardA || !cardB) return { ok: false, reason: "PROFILE_MISSING" };
    batch.set(adminDb().doc(`users/${a}/friends/${b}`), {
      since,
      displayName: cardB.displayName,
      photoURL: cardB.photoURL,
    });
    batch.set(adminDb().doc(`users/${b}/friends/${a}`), {
      since,
      displayName: cardA.displayName,
      photoURL: cardA.photoURL,
    });
  }

  await batch.commit();
  return { ok: true };
}

export async function cancelOutgoing(fromUid: string, toUid: string): Promise<boolean> {
  const sent = await adminDb().doc(`users/${fromUid}/requestsSent/${toUid}`).get();
  if (!sent.exists) return false;
  const batch = adminDb().batch();
  batch.delete(adminDb().doc(`users/${fromUid}/requestsSent/${toUid}`));
  batch.delete(adminDb().doc(`users/${toUid}/requests/${fromUid}`));
  await batch.commit();
  return true;
}

/** Best-effort delete chat messages for a pair. */
export async function deleteFriendChat(pairId: string): Promise<void> {
  const col = adminDb().collection(`friendChats/${pairId}/messages`);
  for (;;) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;
    const batch = adminDb().batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
  }
}

export async function removeFriend(uid: string, friendUid: string): Promise<void> {
  const pair = friendPairId(uid, friendUid);
  await deleteFriendChat(pair);
  const batch = adminDb().batch();
  batch.delete(adminDb().doc(`users/${uid}/friends/${friendUid}`));
  batch.delete(adminDb().doc(`users/${friendUid}/friends/${uid}`));
  await batch.commit();
}

export type ChatMessage = {
  id: string;
  authorUid: string;
  text: string;
  createdAt: number;
};

export async function listFriendMessages(
  pairId: string,
  limit = 80,
): Promise<ChatMessage[]> {
  const snap = await adminDb()
    .collection(`friendChats/${pairId}/messages`)
    .limit(120)
    .get();
  const rows: ChatMessage[] = snap.docs.map((d) => {
    const x = d.data() as { authorUid: string; text: string; createdAt: Timestamp };
    return {
      id: d.id,
      authorUid: x.authorUid,
      text: x.text,
      createdAt: x.createdAt?.toMillis?.() ?? 0,
    };
  });
  rows.sort((a, b) => a.createdAt - b.createdAt);
  return rows.slice(-limit);
}

export async function postFriendMessage(
  pairId: string,
  authorUid: string,
  text: string,
): Promise<void> {
  await adminDb().collection(`friendChats/${pairId}/messages`).add({
    authorUid,
    text,
    createdAt: Timestamp.now(),
  });
}
