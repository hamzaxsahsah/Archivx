import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { upsertPushSubscription, type ClientPushSubscriptionJson } from "@/lib/push/pushSubscriptionStore";
import { isWebPushConfigured } from "@/lib/push/sendWebPush";

export async function POST(request: Request) {
  try {
    if (!isWebPushConfigured()) {
      return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
    }
    const uid = await requireUidFromRequest(request);
    const body = (await request.json()) as ClientPushSubscriptionJson;
    await upsertPushSubscription(uid, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
