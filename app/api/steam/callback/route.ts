import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { upsertUserSteamId } from "@/lib/db/mongoStore";
import { scheduleBackgroundSteamSync } from "@/lib/steam/steamSync";
import { verifySteamOpenIdAssertion } from "@/lib/steamVerify";
import { extractSteam64FromClaimedId } from "@/lib/steamOpenId";
import type { Timestamp as Ts } from "firebase-admin/firestore";

function baseFromRequest(request: Request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}

export async function GET(request: Request) {
  const base = baseFromRequest(request);
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/settings?steam=${code}`, base));

  if (!state) {
    return fail("error");
  }

  let stateSnap;
  try {
    stateSnap = await adminDb().collection("steamLinkStates").doc(state).get();
  } catch {
    return fail("server");
  }

  if (!stateSnap.exists) {
    return fail("expired");
  }

  const data = stateSnap.data() as {
    uid: string;
    expiresAt: Ts;
  };
  if (data.expiresAt.toMillis() < Date.now()) {
    await adminDb().collection("steamLinkStates").doc(state).delete();
    return fail("expired");
  }

  const mode = url.searchParams.get("openid.mode");
  if (mode !== "id_res") {
    return fail("cancel");
  }

  const ok = await verifySteamOpenIdAssertion(url.searchParams);
  if (!ok) {
    return fail("invalid");
  }

  const claimed = url.searchParams.get("openid.claimed_id");
  const steamId = extractSteam64FromClaimedId(claimed);
  if (!steamId) {
    return fail("invalid");
  }

  try {
    await adminDb()
      .doc(`users/${data.uid}`)
      .set({ steamId }, { merge: true });
    await upsertUserSteamId(data.uid, steamId);
    await adminDb().collection("steamLinkStates").doc(state).delete();
    scheduleBackgroundSteamSync(data.uid, steamId);
  } catch {
    return fail("server");
  }

  return NextResponse.redirect(new URL("/settings?steam=linked", base));
}
