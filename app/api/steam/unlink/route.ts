import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getSteamIdForUid, requireUidFromRequest } from "@/lib/authServer";
import {
  deleteSteamDashboardCache,
  deleteSteamProfileSummaryCache,
  upsertUserSteamId,
} from "@/lib/db/mongoStore";
import { deletePushSubscriptionsForUser } from "@/lib/push/pushSubscriptionStore";

export async function POST(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const prevSteamId = await getSteamIdForUid(uid);
    await adminDb().doc(`users/${uid}`).set({ steamId: null }, { merge: true });
    await upsertUserSteamId(uid, null);
    await deleteSteamDashboardCache(uid);
    await deleteSteamProfileSummaryCache(uid);
    await deletePushSubscriptionsForUser(uid);
    if (prevSteamId) {
      revalidateTag(`steam-dashboard-${prevSteamId}`);
      revalidateTag(`steam-rare-${prevSteamId}`);
      revalidateTag(`steam-profile-${prevSteamId}`);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
