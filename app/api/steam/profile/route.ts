import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { isMongoConfigured } from "@/lib/db/mongo";
import {
  getSteamProfileSummaryCache,
  saveSteamProfileSummaryCache,
} from "@/lib/db/mongoStore";
import { steamGetPlayerSummaries } from "@/lib/steamServer";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

const REVALIDATE_SEC = 45;

/** Serve cached Steam summary from Mongo immediately; refresh in background when stale. */
const PROFILE_CACHE_FRESH_MS = 10 * 60 * 1000;

function scheduleSteamProfileCacheRefresh(uid: string, steamId: string) {
  void (async () => {
    try {
      const json = await steamGetPlayerSummaries(steamId);
      await saveSteamProfileSummaryCache(uid, steamId, json);
    } catch {
      /* ignore */
    }
  })();
}

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await withTimeout(getSteamIdForUid(uid), 8_000, "getSteamId");
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }

    if (isMongoConfigured()) {
      const cached = await getSteamProfileSummaryCache(uid);
      if (cached?.steamId === steamId && cached.payload != null) {
        const age = Date.now() - new Date(cached.syncedAt).getTime();
        if (age > PROFILE_CACHE_FRESH_MS) {
          scheduleSteamProfileCacheRefresh(uid, steamId);
        }
        return NextResponse.json(cached.payload);
      }
      const json = await withTimeout(steamGetPlayerSummaries(steamId), 8_000, "steamProfile");
      await saveSteamProfileSummaryCache(uid, steamId, json);
      return NextResponse.json(json);
    }

    const json = await withTimeout(
      unstable_cache(
        () => steamGetPlayerSummaries(steamId),
        ["steam-player-summary", steamId],
        { revalidate: REVALIDATE_SEC, tags: [`steam-profile-${steamId}`] },
      )(),
      8_000,
      "steamProfile",
    );
    return NextResponse.json(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
