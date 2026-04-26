import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { setLobbyStatus } from "@/lib/lobby/lobbyAdmin";

export async function POST(
  request: Request,
  { params }: { params: { lobbyId: string } },
) {
  try {
    const uid = await requireUidFromRequest(request);
    const { status } = await request.json() as { status: "done" | "cancelled" };
    if (status !== "done" && status !== "cancelled") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await setLobbyStatus(params.lobbyId, uid, status);
    return NextResponse.json({ status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
