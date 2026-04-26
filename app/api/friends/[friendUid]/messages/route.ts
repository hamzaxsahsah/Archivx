import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import {
  friendPairId,
  isFriend,
  listFriendMessages,
  postFriendMessage,
} from "@/lib/friends/friendsAdmin";

const MAX_LEN = 2000;

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
    const pair = friendPairId(uid, friendUid);
    const messages = await listFriendMessages(pair);
    return NextResponse.json({ messages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
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
    const body = (await request.json()) as { text?: string };
    const text = (body.text ?? "").trim().slice(0, MAX_LEN);
    if (!text) {
      return NextResponse.json({ error: "EMPTY" }, { status: 400 });
    }
    const pair = friendPairId(uid, friendUid);
    await postFriendMessage(pair, uid, text);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
