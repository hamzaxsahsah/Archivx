import { NextResponse } from "next/server";
import { getSteamIdForUid, requireUidFromRequest } from "@/lib/authServer";
import { getCachedSteamDashboardBundle } from "@/lib/steam/dashboardCache";
import { getPublicUserCard, isFriend } from "@/lib/friends/friendsAdmin";

export async function GET(
  request: Request,
  { params }: { params: { friendUid: string } },
) {
  try {
    const uid = await requireUidFromRequest(request);
    const friendUid = params.friendUid;
    if (!friendUid) {
      return NextResponse.json({ error: "Missing friend" }, { status: 400 });
    }
    if (!(await isFriend(uid, friendUid))) {
      return NextResponse.json({ error: "NOT_FRIENDS" }, { status: 403 });
    }
    const card = await getPublicUserCard(friendUid);
    if (!card) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const steamId = await getSteamIdForUid(friendUid);
    if (!steamId) {
      return NextResponse.json({
        card,
        steamLinked: false,
        bundle: null,
        message: "Friend has not linked Steam yet.",
      });
    }
    const bundle = await getCachedSteamDashboardBundle(steamId);
    return NextResponse.json({
      card,
      steamLinked: true,
      bundle: {
        gamesOwned: bundle.gamesOwned,
        totalUnlocked: bundle.totalUnlocked,
        totalAvailable: bundle.totalAvailable,
        completionPct: bundle.completionPct,
        rareUnlocked: bundle.rareUnlocked,
        privateProfile: bundle.privateProfile,
        recentUnlocks: bundle.recentUnlocks.slice(0, 12),
        mostPlayed: bundle.mostPlayed.slice(0, 6),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
