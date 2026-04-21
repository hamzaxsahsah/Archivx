import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { buildRareAchievements } from "@/lib/achievementQueries";

const REVALIDATE_SEC = 120;

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }
    const rows = await unstable_cache(
      () => buildRareAchievements(steamId),
      ["steam-rare-achievements", steamId],
      { revalidate: REVALIDATE_SEC, tags: [`steam-rare-${steamId}`] },
    )();
    return NextResponse.json({ achievements: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
