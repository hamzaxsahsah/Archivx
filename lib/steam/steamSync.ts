import { getCachedSteamDashboardBundle } from "@/lib/steam/dashboardCache";
import { notifyNewAchievementsIfAny } from "@/lib/steam/maybeNotifyAchievements";
import { getSteamDashboardCache, saveSteamDashboardCache } from "@/lib/db/mongoStore";
import { isMongoConfigured } from "@/lib/db/mongo";

const SYNC_LABEL = "[steam-sync]";

// Fire-and-forget background promises are truncated on serverless platforms
// (Netlify, Vercel) once the HTTP response is sent. Skip background sync there
// and rely on the per-request cache path in the dashboard route instead.
function isServerless(): boolean {
  return process.env.NETLIFY === "true" || Boolean(process.env.VERCEL);
}

/** Full Steam → Mongo dashboard bundle sync (heavy). */
export async function syncDashboardBundleToMongo(
  firebaseUid: string,
  steamId: string,
): Promise<void> {
  if (!isMongoConfigured()) return;
  try {
    const previous = await getSteamDashboardCache(firebaseUid);
    const bundle = await getCachedSteamDashboardBundle(steamId);
    await saveSteamDashboardCache(firebaseUid, steamId, bundle);
    if (previous?.bundle) {
      await notifyNewAchievementsIfAny(firebaseUid, previous.bundle, bundle);
    }
  } catch (e) {
    console.error(SYNC_LABEL, firebaseUid, e);
    throw e;
  }
}

/**
 * Fire-and-forget background refresh (stale-while-revalidate pattern).
 * Safe in Docker/Node where the process outlives the HTTP response.
 * Skipped on Netlify/Vercel — the Lambda is frozen after the response is sent
 * so the async work would be silently truncated mid-flight.
 */
export function scheduleBackgroundSteamSync(firebaseUid: string, steamId: string): void {
  if (!isMongoConfigured()) return;
  if (isServerless()) return;
  void Promise.resolve()
    .then(() => syncDashboardBundleToMongo(firebaseUid, steamId))
    .catch((e) => console.error(SYNC_LABEL, "background", firebaseUid, e));
}
