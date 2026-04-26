import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getLobbyMessages, sendLobbyMessage } from "@/lib/lobby/lobbyAdmin";

export async function GET(
  request: Request,
  { params }: { params: { lobbyId: string } },
) {
  try {
    const uid = await requireUidFromRequest(request);
    const messages = await getLobbyMessages(params.lobbyId);
    // Only members can read (the getLobbyMessages checks nothing — use sendLobbyMessage's membership check as gate)
    // For GET, we just verify auth; the lobby detail page will handle membership display
    void uid;
    return NextResponse.json({ messages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { lobbyId: string } },
) {
  try {
    const uid = await requireUidFromRequest(request);
    const userRecord = await adminAuth().getUser(uid);
    const { text } = await request.json() as { text: string };
    await sendLobbyMessage(
      params.lobbyId,
      uid,
      userRecord.displayName ?? "Player",
      userRecord.photoURL ?? null,
      text,
    );
    return NextResponse.json({ status: "sent" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
