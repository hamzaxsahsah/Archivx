import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { getCachedSteamDashboardBundle } from "@/lib/steam/dashboardCache";

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }
    const bundle = await getCachedSteamDashboardBundle(steamId);
    return NextResponse.json({ achievements: bundle.rareList ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
