import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { respondToRequest } from "@/lib/friendsAdmin";

export async function POST(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const body = (await request.json()) as { fromUid?: string; accept?: boolean };
    const fromUid = body.fromUid?.trim();
    if (!fromUid) {
      return NextResponse.json({ error: "fromUid required" }, { status: 400 });
    }
    const accept = Boolean(body.accept);
    const r = await respondToRequest(uid, fromUid, accept);
    if (!r.ok) {
      return NextResponse.json({ error: r.reason }, { status: 400 });
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
