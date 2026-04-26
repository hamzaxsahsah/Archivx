import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { getLobby } from "@/lib/lobby/lobbyAdmin";

export async function GET(
  request: Request,
  { params }: { params: { lobbyId: string } },
) {
  try {
    await requireUidFromRequest(request);
    const lobby = await getLobby(params.lobbyId);
    if (!lobby) return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
    return NextResponse.json({ lobby });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
