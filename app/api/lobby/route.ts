import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { adminAuth } from "@/lib/firebaseAdmin";
import { createLobby, listLobbies } from "@/lib/lobby/lobbyAdmin";

export async function GET(request: Request) {
  try {
    await requireUidFromRequest(request);
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId") ? parseInt(searchParams.get("appId")!) : undefined;
    const lobbies = await listLobbies({ appId });
    return NextResponse.json({ lobbies });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await requireUidFromRequest(request);
    const userRecord = await adminAuth().getUser(uid);
    const body = await request.json() as {
      appId: number;
      gameName: string;
      apiname: string;
      achievementName: string;
      icon: string;
      rarityPct: number | null;
      requiredPlayers: number;
      note: string;
      scheduledAt: string | null;
    };
    if (!body.appId || !body.apiname || !body.achievementName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (![2, 3, 4].includes(body.requiredPlayers)) {
      return NextResponse.json({ error: "requiredPlayers must be 2, 3, or 4" }, { status: 400 });
    }
    const lobbyId = await createLobby({
      uid,
      displayName: userRecord.displayName ?? "Player",
      photoURL: userRecord.photoURL ?? null,
      ...body,
    });
    return NextResponse.json({ lobbyId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
