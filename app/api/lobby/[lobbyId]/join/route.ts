import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { adminAuth } from "@/lib/firebaseAdmin";
import { joinLobby, getLobby } from "@/lib/lobby/lobbyAdmin";
import { notifyLobbyJoined, notifyLobbyFull } from "@/lib/lobby/notifyLobbyPush";

export async function POST(
  request: Request,
  { params }: { params: { lobbyId: string } },
) {
  try {
    const uid = await requireUidFromRequest(request);
    const userRecord = await adminAuth().getUser(uid);
    const displayName = userRecord.displayName ?? "Player";
    const photoURL = userRecord.photoURL ?? null;

    const result = await joinLobby(params.lobbyId, uid, displayName, photoURL);
    if (result.alreadyIn) {
      return NextResponse.json({ status: "already_in" });
    }

    const updatedLobby = await getLobby(params.lobbyId);
    if (updatedLobby) {
      void notifyLobbyJoined(updatedLobby, { uid, displayName, photoURL });
      if (result.nowFull) void notifyLobbyFull(updatedLobby, uid);
    }

    return NextResponse.json({ status: result.nowFull ? "full" : "joined" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
