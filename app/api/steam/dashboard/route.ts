import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { getCachedSteamDashboardBundle } from "@/lib/steam/dashboardCache";
import { isMongoConfigured } from "@/lib/db/mongo";
import {
  getSteamDashboardCache,
  saveSteamDashboardCache,
} from "@/lib/db/mongoStore";
import { scheduleBackgroundSteamSync, syncDashboardBundleToMongo } from "@/lib/steam/steamSync";

/** Return Mongo cache immediately if younger than this; older caches still returned + background refresh. */
const MONGO_FRESH_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }

    if (isMongoConfigured()) {
      const cached = await getSteamDashboardCache(uid);
      if (cached?.bundle && cached.steamId === steamId) {
        const age = Date.now() - new Date(cached.syncedAt).getTime();
        if (age > MONGO_FRESH_MS) {
          scheduleBackgroundSteamSync(uid, steamId);
        }
        return NextResponse.json(cached.bundle);
      }
      try {
        await syncDashboardBundleToMongo(uid, steamId);
      } catch {
        /* fall through to live build */
      }
      const after = await getSteamDashboardCache(uid);
      if (after?.bundle) {
        return NextResponse.json(after.bundle);
      }
      const bundle = await getCachedSteamDashboardBundle(steamId);
      await saveSteamDashboardCache(uid, steamId, bundle);
      return NextResponse.json(bundle);
    }

    const bundle = await getCachedSteamDashboardBundle(steamId);
    return NextResponse.json(bundle);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
