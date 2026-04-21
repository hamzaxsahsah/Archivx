import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function requireUidFromRequest(request: Request): Promise<string> {
  const h = request.headers.get("authorization");
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    throw new Error("Unauthorized");
  }
  const decoded = await adminAuth().verifyIdToken(token);
  return decoded.uid;
}

export async function getSteamIdForUid(uid: string): Promise<string | null> {
  const snap = await adminDb().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  const d = snap.data() as { steamId?: string | null };
  return d.steamId ?? null;
}
