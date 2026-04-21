import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { steamGetSchemaForGame } from "@/lib/steamServer";

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
    void steamId;
    // Game schemas rarely change — safe to cache for 24 h.
    const json = await unstable_cache(
      () => steamGetSchemaForGame(Number(appId)),
      ["steam-schema", appId],
      { revalidate: 86400 },
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
