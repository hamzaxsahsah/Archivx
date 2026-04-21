import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { steamGetPlayerSummaries } from "@/lib/steamServer";

const REVALIDATE_SEC = 45;

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }
    const json = await unstable_cache(
      () => steamGetPlayerSummaries(steamId),
      ["steam-player-summary", steamId],
      { revalidate: REVALIDATE_SEC, tags: [`steam-profile-${steamId}`] },
    )();
    return NextResponse.json(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
