"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/apiClient";
import type { GuideResponse } from "@/app/api/achievement/guide/route";
import type { AchievementModalData } from "@/components/achievements/AchievementModal";

const guideCache = new Map<string, GuideResponse>();

export function AchievementGuidePanel({
  achievement,
}: {
  achievement: AchievementModalData;
}) {
  const cacheKey = `${achievement.appid}-${achievement.apiname}`;
  const [guide, setGuide] = useState<GuideResponse | null>(
    guideCache.get(cacheKey) ?? null,
  );
  const [loading, setLoading] = useState(!guideCache.has(cacheKey));
  const fetchedRef = useRef(guideCache.has(cacheKey));

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const params = new URLSearchParams({
      appId: String(achievement.appid),
      apiname: achievement.apiname,
      gameName: achievement.gameName,
      displayName: achievement.displayName,
    });
    authedFetch(`/api/achievement/guide?${params}`)
      .then((r) => r.json() as Promise<GuideResponse>)
      .then((data) => {
        guideCache.set(cacheKey, data);
        setGuide(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cacheKey, achievement]);

  const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${achievement.gameName} ${achievement.displayName} achievement guide`,
  )}`;

  return (
    <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
      {loading ? (
        <>
          <div className="space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
          </div>
          <div className="aspect-video w-full animate-pulse rounded-xl bg-white/5" />
        </>
      ) : (
        <>
          {guide?.description ? (
            <p className="text-sm leading-relaxed text-zinc-300">
              {guide.description}
            </p>
          ) : null}

          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              How to unlock
            </p>
            {guide?.video ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${guide.video.videoId}?rel=0&modestbranding=1`}
                  title={guide.video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            ) : (
              <a
                href={ytSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-red-500"
                >
                  <path d="M23.5 6.2c-.3-1-1-1.8-2-2C19.8 4 12 4 12 4s-7.8 0-9.5.3c-1 .3-1.7 1-2 2C.2 8 .2 12 .2 12s0 4 .3 5.8c.3 1 1 1.8 2 2C4.2 20 12 20 12 20s7.8 0 9.5-.3c1-.3 1.7-1 2-2 .3-1.8.3-5.8.3-5.8s0-4-.3-5.7zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z" />
                </svg>
                Search guide on YouTube
              </a>
            )}
          </div>

          <div className="border-t border-white/5 pt-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Need co-op players?
            </p>
            <Link
              href={`/lobby?appId=${achievement.appid}&apiname=${encodeURIComponent(achievement.apiname)}&achievementName=${encodeURIComponent(achievement.displayName)}&gameName=${encodeURIComponent(achievement.gameName)}${achievement.icon ? `&icon=${encodeURIComponent(achievement.icon)}` : ""}${achievement.rarityPct !== null && achievement.rarityPct !== undefined ? `&rarityPct=${achievement.rarityPct}` : ""}`}
              className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent transition hover:border-accent/50 hover:bg-accent/15"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Find Players
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
