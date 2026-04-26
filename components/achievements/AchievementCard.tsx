"use client";

import { useState } from "react";
import Image from "next/image";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { AchievementGuidePanel } from "@/components/achievements/AchievementGuidePanel";
import { steamAchievementIconUrl } from "@/lib/steam/steamImages";

export type AchievementRowView = {
  apiname: string;
  displayName: string;
  description: string;
  icon: string;
  icongray?: string;
  achieved: boolean;
  unlocktime?: number;
  rarityPct: number | null;
};

function fmtDate(t?: number) {
  if (!t) return null;
  return new Date(t * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AchievementCard({
  appId,
  gameName = "",
  row,
}: {
  appId: number;
  gameName?: string;
  row: AchievementRowView;
}) {
  const [expanded, setExpanded] = useState(false);
  const unlocked = row.achieved;
  const date = fmtDate(row.unlocktime);

  const hash = unlocked ? row.icon : row.icongray || row.icon;
  const iconSrc = hash ? steamAchievementIconUrl(appId, hash) : "";

  return (
    <div
      className={`rounded-xl border transition ${
        unlocked
          ? row.rarityPct !== null && row.rarityPct < 1
            ? "animate-pulse-gold border-gold/40 bg-gradient-to-br from-surface to-[#141820]"
            : "border-gold/25 bg-gradient-to-br from-surface to-[#141820]"
          : "border-border bg-surface/60 opacity-80"
      }`}
    >
      {/* main row */}
      <div className="group relative flex gap-3 p-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-black/50">
          {iconSrc ? (
            <Image
              src={iconSrc}
              alt=""
              fill
              className={`object-cover ${unlocked ? "" : "grayscale"}`}
              sizes="64px"
              quality={90}
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGlAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8BP//Z"
            />
          ) : null}
          {!unlocked ? (
            <div className="absolute inset-0 grid place-items-center bg-black/55" aria-hidden>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6 text-white/40"
              >
                <path
                  fillRule="evenodd"
                  d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-start gap-x-2 gap-y-1">
            <h3 className="font-display text-sm font-semibold text-zinc-100 [overflow-wrap:anywhere]">
              {row.displayName || row.apiname}
            </h3>
            <RarityBadge percent={row.rarityPct} />
          </div>
          <p className="line-clamp-2 text-xs text-zinc-500">{row.description}</p>
          {unlocked && date ? (
            <p className="mt-1 font-mono text-[11px] text-gold/90">Unlocked {date}</p>
          ) : null}
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse guide" : "Show guide"}
          className="shrink-0 self-start rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {!unlocked ? (
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
        ) : (
          <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100">
            <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]" />
          </div>
        )}
      </div>

      {/* inline guide panel */}
      {expanded && (
        <AchievementGuidePanel
          achievement={{
            appid: appId,
            gameName,
            apiname: row.apiname,
            displayName: row.displayName,
            icon: row.icon,
            rarityPct: row.rarityPct,
          }}
        />
      )}
    </div>
  );
}
