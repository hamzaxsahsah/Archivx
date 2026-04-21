import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { requireUidFromRequest, getSteamIdForUid } from "@/lib/authServer";
import { buildDashboardBundle } from "@/lib/dashboardStats";

/** Steam work is huge (every game × 3 API calls). Cache per Steam ID for a short window. */
const REVALIDATE_SEC = 90;

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const steamId = await getSteamIdForUid(uid);
    if (!steamId) {
      return NextResponse.json({ error: "STEAM_NOT_LINKED" }, { status: 400 });
    }
    const bundle = await unstable_cache(
      () => buildDashboardBundle(steamId),
      ["steam-dashboard-bundle", steamId],
      { revalidate: REVALIDATE_SEC, tags: [`steam-dashboard-${steamId}`] },
    )();
    return NextResponse.json(bundle);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
