/**
 * One-time migration: Firestore users + snapshots → MongoDB.
 *
 * Prerequisites: MONGODB_URI, FIREBASE_SERVICE_ACCOUNT_JSON (same as Next app).
 *
 * Usage (from repo root):
 *   npx tsx --tsconfig tsconfig.json scripts/migrate-firestore-to-mongo.ts
 */

import { resolve } from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { adminDb } = await import("../lib/firebaseAdmin");
  const { getMongoDb } = await import("../lib/db/mongo");
  const { migrateSnapshots } = await import("../lib/db/mongoStore");

  const mongo = await getMongoDb();
  if (!mongo) {
    console.error("Set MONGODB_URI in .env.local");
    process.exit(1);
  }

  await mongo.collection("users").createIndex({ firebaseUid: 1 }, { unique: true });
  await mongo.collection("steam_dashboard_cache").createIndex({ firebaseUid: 1 }, { unique: true });
  await mongo.collection("steam_profile_cache").createIndex({ firebaseUid: 1 }, { unique: true });
  await mongo.collection("activity_snapshots").createIndex({ firebaseUid: 1, date: 1 }, { unique: true });

  const usersSnap = await adminDb().collection("users").get();
  let usersMigrated = 0;
  let snapsMigrated = 0;

  const now = new Date();

  for (const doc of usersSnap.docs) {
    const uid = doc.id;
    const d = doc.data();
    await mongo.collection("users").updateOne(
      { firebaseUid: uid },
      {
        $set: {
          firebaseUid: uid,
          email: (d.email as string) ?? null,
          displayName: (d.displayName as string) ?? null,
          photoURL: (d.photoURL as string) ?? null,
          steamId: (d.steamId as string) ?? null,
          updatedAt: now,
          migratedFromFirestoreAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    usersMigrated++;

    const snaps = await adminDb().collection(`users/${uid}/snapshots`).get();
    const rows: { date: string; totalUnlocked: number }[] = [];
    for (const s of snaps.docs) {
      const x = s.data() as { totalUnlocked?: number };
      rows.push({
        date: s.id,
        totalUnlocked: x.totalUnlocked ?? 0,
      });
      snapsMigrated++;
    }
    if (rows.length) await migrateSnapshots(uid, rows);
  }

  console.log(
    `Done. Users migrated: ${usersMigrated}, snapshot docs processed: ${snapsMigrated}`,
  );
  const { closeMongo } = await import("../lib/db/mongo");
  await closeMongo();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
