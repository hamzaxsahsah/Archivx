import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { deletePushSubscriptionForUser } from "@/lib/push/pushSubscriptionStore";

export async function POST(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const body = (await request.json()) as { endpoint?: string };
    const endpoint = body.endpoint;
    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    }
    await deletePushSubscriptionForUser(endpoint, uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
