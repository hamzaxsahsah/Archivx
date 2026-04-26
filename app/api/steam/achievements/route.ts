import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { isMongoConfigured } from "@/lib/db/mongo";
import { scheduleBackgroundSteamSync } from "@/lib/steam/steamSync";
import { steamGetPlayerAchievements } from "@/lib/steamServer";

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }
    const url = new URL(request.url);
    const appId = url.searchParams.get("appId");
    if (!appId) {
      return NextResponse.json({ error: "appId required" }, { status: 400 });
    }
    const json = await steamGetPlayerAchievements(steamId, Number(appId));
    if (isMongoConfigured()) scheduleBackgroundSteamSync(uid, steamId);
    return NextResponse.json(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
