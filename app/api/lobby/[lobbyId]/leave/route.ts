import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { leaveLobby } from "@/lib/lobby/lobbyAdmin";

export async function POST(
  request: Request,
  { params }: { params: { lobbyId: string } },
) {
  try {
    const uid = await requireUidFromRequest(request);
    await leaveLobby(params.lobbyId, uid);
    return NextResponse.json({ status: "left" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
