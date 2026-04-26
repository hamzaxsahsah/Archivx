import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { requireUidFromRequest } from "@/lib/authServer";
import { steamGetSchemaForGame } from "@/lib/steamServer";
import { searchAchievementGuideVideo } from "@/lib/steam/youtubeSearch";

export type GuideResponse = {
  description: string;
  hidden: boolean;
  video: { videoId: string; title: string } | null;
};

export async function GET(request: Request) {
  try {
    await requireUidFromRequest(request);

    const { searchParams } = new URL(request.url);
    const appId = parseInt(searchParams.get("appId") ?? "0", 10);
    const apiname = searchParams.get("apiname") ?? "";
    const gameName = searchParams.get("gameName") ?? "";
    const displayName = searchParams.get("displayName") ?? "";

    if (!appId || !apiname) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const schemaJson = await unstable_cache(
      () => steamGetSchemaForGame(appId),
      ["achievement-schema", String(appId)],
      { revalidate: 86400 },
    )();

    const achievements = schemaJson.game?.availableGameStats?.achievements ?? [];
    const ach = achievements.find((a) => a.name === apiname);

    const query = `${gameName} ${displayName} achievement guide`;
    const video = await searchAchievementGuideVideo(appId, apiname, query);

    const result: GuideResponse = {
      description: ach?.description ?? "",
      hidden: (ach?.hidden ?? 0) === 1,
      video,
    };

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
