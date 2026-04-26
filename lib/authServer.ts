import { adminAuth } from "@/lib/firebaseAdmin";
import { getSteamIdMongoFirst } from "@/lib/db/mongoStore";

const inflightSteamId = new Map<string, Promise<string | null>>();

export async function requireUidFromRequest(request: Request): Promise<string> {
  const h = request.headers.get("authorization");
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    throw new Error("Unauthorized");
  }
  const decoded = await adminAuth().verifyIdToken(token);
  return decoded.uid;
}

/** Prefer MongoDB (synced profile); hydrate from Firestore when needed. */
export async function getSteamIdForUid(uid: string): Promise<string | null> {
  let p = inflightSteamId.get(uid);
  if (!p) {
    p = getSteamIdMongoFirst(uid).finally(() => {
      inflightSteamId.delete(uid);
    });
    inflightSteamId.set(uid, p);
  }
  return p;
}
