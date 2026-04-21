import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { steamGetGlobalAchievementPercentages } from "@/lib/steamServer";

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }
    void steamId;
    const url = new URL(request.url);
    const appId = url.searchParams.get("appId");
    if (!appId) {
      return NextResponse.json({ error: "appId required" }, { status: 400 });
    }
    // Global percentages shift slowly — 1 h cache is safe.
    const json = await unstable_cache(
      () => steamGetGlobalAchievementPercentages(Number(appId)),
      ["steam-rarity", appId],
      { revalidate: 3600 },
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
