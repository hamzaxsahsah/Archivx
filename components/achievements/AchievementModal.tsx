"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { authedFetch } from "@/lib/apiClient";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { steamAchievementIconUrl } from "@/lib/steam/steamImages";
import type { GuideResponse } from "@/app/api/achievement/guide/route";

export type AchievementModalData = {
  appid: number;
  gameName: string;
  apiname: string;
  displayName: string;
  icon: string;
  rarityPct: number | null;
};

export function AchievementModal({
  achievement,
  onClose,
}: {
  achievement: AchievementModalData | null;
  onClose: () => void;
}) {
  const [guide, setGuide] = useState<GuideResponse | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(false);

  useEffect(() => {
    if (!achievement) {
      setGuide(null);
      return;
    }
    let cancelled = false;
    setLoadingGuide(true);
    setGuide(null);
    const params = new URLSearchParams({
      appId: String(achievement.appid),
      apiname: achievement.apiname,
      gameName: achievement.gameName,
      displayName: achievement.displayName,
    });
    authedFetch(`/api/achievement/guide?${params}`)
      .then((r) => r.json() as Promise<GuideResponse>)
      .then((data) => {
        if (!cancelled) {
          setGuide(data);
          setLoadingGuide(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingGuide(false);
      });
    return () => {
      cancelled = true;
    };
  }, [achievement]);

  useEffect(() => {
    if (!achievement) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [achievement, onClose]);

  useEffect(() => {
    document.body.style.overflow = achievement ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [achievement]);

  if (!achievement) return null;

  const iconUrl = achievement.icon
    ? steamAchievementIconUrl(achievement.appid, achievement.icon)
    : null;

  const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${achievement.gameName} ${achievement.displayName} achievement guide`,
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={achievement.displayName}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* card */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">

        {/* header row */}
        <div className="flex items-start gap-4 p-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10">
            {iconUrl && (
              <Image
                src={iconUrl}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                quality={90}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold leading-tight text-white">
              {achievement.displayName}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-zinc-400">
              {achievement.gameName}
            </p>
            <div className="mt-2">
              <RarityBadge percent={achievement.rarityPct} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* description */}
        <div className="px-5 pb-4">
          {loadingGuide ? (
            <div className="space-y-2">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          ) : guide?.description ? (
            <p className="text-sm leading-relaxed text-zinc-300">
              {guide.description}
            </p>
          ) : null}
        </div>

        {/* video section */}
        <div className="px-5 pb-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            How to unlock
          </p>

          {loadingGuide ? (
            <div className="aspect-video w-full animate-pulse rounded-xl bg-white/5" />
          ) : guide?.video ? (
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
      </div>
    </div>
  );
}
