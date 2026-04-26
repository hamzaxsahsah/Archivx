import type { Document } from "mongodb";
import { adminDb } from "@/lib/firebaseAdmin";
import { getMongoDb, isMongoConfigured } from "@/lib/db/mongo";
import type { DashboardBundle } from "@/lib/steam/dashboardStats";

const USERS = "users";
const STEAM_CACHE = "steam_dashboard_cache";
const STEAM_PROFILE_CACHE = "steam_profile_cache";
const SNAPSHOTS = "activity_snapshots";

export type MongoUserDoc = {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  steamId: string | null;
  createdAt: Date;
  updatedAt: Date;
  migratedFromFirestoreAt?: Date | null;
};

async function usersColl() {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<MongoUserDoc>(USERS);
}

async function cacheColl() {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection(STEAM_CACHE);
}

async function steamProfileColl() {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection(STEAM_PROFILE_CACHE);
}

/** Hydrate Mongo user row from Firestore when missing (migration / first API hit). */
export async function ensureMongoUserFromFirestore(uid: string): Promise<void> {
  if (!isMongoConfigured()) return;
  const col = await usersColl();
  if (!col) return;
  const existing = await col.findOne({ firebaseUid: uid });
  if (existing) return;
  const snap = await adminDb().doc(`users/${uid}`).get();
  if (!snap.exists) return;
  const d = snap.data() as Record<string, unknown>;
  const now = new Date();
  await col.updateOne(
    { firebaseUid: uid },
    {
      $setOnInsert: {
        firebaseUid: uid,
        createdAt: now,
        migratedFromFirestoreAt: now,
      },
      $set: {
        email: (d.email as string) ?? null,
        displayName: (d.displayName as string) ?? null,
        photoURL: (d.photoURL as string) ?? null,
        steamId: (d.steamId as string) ?? null,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

export async function getSteamIdMongoFirst(uid: string): Promise<string | null> {
  await ensureMongoUserFromFirestore(uid);
  if (!isMongoConfigured()) {
    const snap = await adminDb().doc(`users/${uid}`).get();
    if (!snap.exists) return null;
    const d = snap.data() as { steamId?: string | null };
    return d.steamId ?? null;
  }
  const col = await usersColl();
  if (!col) {
    const snap = await adminDb().doc(`users/${uid}`).get();
    if (!snap.exists) return null;
    return ((snap.data() as { steamId?: string | null }).steamId ?? null) || null;
  }
  const u = await col.findOne({ firebaseUid: uid });
  if (u?.steamId) return u.steamId;
  const snap = await adminDb().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  const d = snap.data() as { steamId?: string | null };
  const sid = d.steamId ?? null;
  if (sid) {
    await col.updateOne(
      { firebaseUid: uid },
      {
        $set: { steamId: sid, updatedAt: new Date() },
        $setOnInsert: {
          firebaseUid: uid,
          email: (d as { email?: string }).email ?? null,
          displayName: (d as { displayName?: string }).displayName ?? null,
          photoURL: (d as { photoURL?: string }).photoURL ?? null,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
  return sid;
}

export async function upsertUserSteamId(uid: string, steamId: string | null): Promise<void> {
  const now = new Date();
  if (isMongoConfigured()) {
    const col = await usersColl();
    if (col) {
      await col.updateOne(
        { firebaseUid: uid },
        {
          $set: { steamId, updatedAt: now },
          $setOnInsert: {
            firebaseUid: uid,
            email: null,
            displayName: null,
            photoURL: null,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }
}

export type SteamCacheDoc = {
  firebaseUid: string;
  steamId: string;
  bundle: DashboardBundle;
  syncedAt: Date;
};

export async function getSteamDashboardCache(uid: string): Promise<SteamCacheDoc | null> {
  const col = await cacheColl();
  if (!col) return null;
  const doc = await col.findOne({ firebaseUid: uid });
  if (!doc) return null;
  return doc as unknown as SteamCacheDoc;
}

export async function saveSteamDashboardCache(
  uid: string,
  steamId: string,
  bundle: DashboardBundle,
): Promise<void> {
  const col = await cacheColl();
  if (!col) return;
  await col.updateOne(
    { firebaseUid: uid },
    {
      $set: {
        firebaseUid: uid,
        steamId,
        bundle: bundle as unknown as Document,
        syncedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function deleteSteamDashboardCache(uid: string): Promise<void> {
  const col = await cacheColl();
  if (!col) return;
  await col.deleteOne({ firebaseUid: uid });
}

export type SteamProfileCacheDoc = {
  firebaseUid: string;
  steamId: string;
  payload: unknown;
  syncedAt: Date;
};

export async function getSteamProfileSummaryCache(uid: string): Promise<SteamProfileCacheDoc | null> {
  const col = await steamProfileColl();
  if (!col) return null;
  const doc = await col.findOne({ firebaseUid: uid });
  if (!doc) return null;
  return doc as unknown as SteamProfileCacheDoc;
}

export async function saveSteamProfileSummaryCache(
  uid: string,
  steamId: string,
  payload: unknown,
): Promise<void> {
  const col = await steamProfileColl();
  if (!col) return;
  await col.updateOne(
    { firebaseUid: uid },
    {
      $set: {
        firebaseUid: uid,
        steamId,
        payload,
        syncedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function deleteSteamProfileSummaryCache(uid: string): Promise<void> {
  const col = await steamProfileColl();
  if (!col) return;
  await col.deleteOne({ firebaseUid: uid });
}

/** Optional: migrated Firestore daily snapshots for offline trend */
export async function migrateSnapshots(uid: string, rows: { date: string; totalUnlocked: number }[]) {
  const db = await getMongoDb();
  if (!db || rows.length === 0) return;
  const c = db.collection(SNAPSHOTS);
  await c.createIndex({ firebaseUid: 1, date: 1 }, { unique: true });
  const now = new Date();
  for (const r of rows) {
    await c.updateOne(
      { firebaseUid: uid, date: r.date },
      {
        $set: {
          firebaseUid: uid,
          date: r.date,
          totalUnlocked: r.totalUnlocked,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
}
