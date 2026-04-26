import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { isMongoConfigured } from "@/lib/db/mongo";
import { scheduleBackgroundSteamSync } from "@/lib/steam/steamSync";
import { steamGetOwnedGames } from "@/lib/steamServer";

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }
    const json = await steamGetOwnedGames(steamId);
    const games = json.response?.games ?? [];
    if (!games.length) {
      return NextResponse.json({
        games: [],
        privateProfile: true,
        message:
          "No owned games returned. Your Steam profile or Game Details may be private — set your Steam profile to Public and ensure “Game details” is public in Steam privacy settings.",
      });
    }
    if (isMongoConfigured()) scheduleBackgroundSteamSync(uid, steamId);
    return NextResponse.json({ games, privateProfile: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
