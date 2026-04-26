import { unstable_cache } from "next/cache";

export type YouTubeVideo = {
  videoId: string;
  title: string;
};

type YTData = Record<string, unknown>;

async function scrapeYouTube(query: string): Promise<YouTubeVideo | null> {
  try {
    const qs = new URLSearchParams({
      search_query: query,
      sp: "EgIQAQ", // videos only filter
      hl: "en",
    });
    const res = await fetch(`https://www.youtube.com/results?${qs}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const marker = "var ytInitialData = ";
    const start = html.indexOf(marker);
    if (start === -1) return null;

    const jsonStart = start + marker.length;
    const end = html.indexOf(";</script>", jsonStart);
    if (end === -1) return null;

    const data = JSON.parse(html.slice(jsonStart, end)) as YTData;

    const sections: unknown[] =
      ((((data?.contents as YTData)
        ?.twoColumnSearchResultsRenderer as YTData)
        ?.primaryContents as YTData)
        ?.sectionListRenderer as YTData)
        ?.contents as unknown[] ?? [];

    for (const section of sections) {
      const items: unknown[] =
        ((section as YTData)?.itemSectionRenderer as YTData)
          ?.contents as unknown[] ?? [];
      for (const item of items) {
        const v = (item as YTData)?.videoRenderer as YTData | undefined;
        if (typeof v?.videoId === "string") {
          const runs = ((v.title as YTData)?.runs as { text: string }[]) ?? [];
          return {
            videoId: v.videoId,
            title: runs[0]?.text ?? query,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function searchAchievementGuideVideo(
  appId: number,
  apiname: string,
  query: string,
): Promise<YouTubeVideo | null> {
  return unstable_cache(
    () => scrapeYouTube(query),
    ["yt-guide", String(appId), apiname],
    { revalidate: 60 * 60 * 24 * 7 },
  )();
}
