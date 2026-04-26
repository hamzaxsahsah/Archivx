import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { cancelOutgoing } from "@/lib/friends/friendsAdmin";

export async function POST(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const body = (await request.json()) as { toUid?: string };
    const toUid = body.toUid?.trim();
    if (!toUid) {
      return NextResponse.json({ error: "toUid required" }, { status: 400 });
    }
    const ok = await cancelOutgoing(uid, toUid);
    if (!ok) {
      return NextResponse.json({ error: "NO_OUTGOING" }, { status: 400 });
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
