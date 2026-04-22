import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  sendFriendRequest,
} from "@/lib/friendsAdmin";

export async function GET(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const [friends, incoming, outgoing] = await Promise.all([
      listFriends(uid),
      listIncomingRequests(uid),
      listOutgoingRequests(uid),
    ]);
    return NextResponse.json({ friends, incoming, outgoing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const body = (await request.json()) as { targetUid?: string };
    const targetUid = body.targetUid?.trim();
    if (!targetUid) {
      return NextResponse.json({ error: "targetUid required" }, { status: 400 });
    }
    const r = await sendFriendRequest(uid, targetUid);
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
