import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { isFriend, removeFriend } from "@/lib/friendsAdmin";

export async function DELETE(
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
    await removeFriend(uid, friendUid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
