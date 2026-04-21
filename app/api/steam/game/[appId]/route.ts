/**
 * Merged game-detail endpoint.
 * Replaces 4 separate browser→server round trips (schema + achievements + rarity + games)
 * with a single authenticated request. All Steam calls run in parallel on the server.
 * Each layer has its own cache TTL reflecting how often that data changes.
 */
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import {
  steamGetSchemaForGame,
  steamGetPlayerAchievements,
  steamGetGlobalAchievementPercentages,
  steamGetOwnedGames,
} from "@/lib/steamServer";

const SCHEMA_TTL = 86400; // 24 h — game schemas rarely change
const RARITY_TTL = 3600;  // 1 h  — global percentages drift slowly
const PLAYER_TTL = 120;   // 2 min — player unlocks change when they're playing
const GAMES_TTL  = 300;   // 5 min — owned games list is stable

export async function GET(
  request: Request,
  { params }: { params: { appId: string } },
) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }

    const appId = Number(params.appId);
    if (!Number.isFinite(appId) || appId <= 0) {
      return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
    }

    const [schemaJson, playerJson, globalJson, gamesJson] = await Promise.all([
      unstable_cache(
        () => steamGetSchemaForGame(appId),
        ["steam-schema", String(appId)],
        { revalidate: SCHEMA_TTL },
      )(),
      unstable_cache(
        () => steamGetPlayerAchievements(steamId, appId),
        ["steam-player-ach", steamId, String(appId)],
        { revalidate: PLAYER_TTL },
      )(),
      unstable_cache(
        () => steamGetGlobalAchievementPercentages(appId),
        ["steam-rarity", String(appId)],
        { revalidate: RARITY_TTL },
      )(),
      unstable_cache(
        () => steamGetOwnedGames(steamId),
        ["steam-owned-games", steamId],
        { revalidate: GAMES_TTL },
      )(),
    ]);

    const game = gamesJson.response?.games?.find((g) => g.appid === appId) ?? null;

    return NextResponse.json({ schema: schemaJson, player: playerJson, global: globalJson, game });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
