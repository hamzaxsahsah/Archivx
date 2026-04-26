"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PerGameProgress } from "@/lib/steam/dashboardStats";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { steamCommunityIconUrl, steamLibraryCapsuleUrl } from "@/lib/steam/steamImages";

function GameCoverImage({
  appid,
  imgIconUrl,
}: {
  appid: number;
  imgIconUrl?: string;
}) {
  const [phase, setPhase] = useState<"library" | "icon" | "none">("library");
  const icon = imgIconUrl ? steamCommunityIconUrl(appid, imgIconUrl) : null;
  const library = steamLibraryCapsuleUrl(appid);

  if (phase === "none") {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-500">No art</div>
    );
  }

  const src = phase === "library" ? library : icon!;
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="(max-width: 768px) 50vw, min(320px, 33vw)"
      quality={88}
      className="object-cover opacity-90 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-100"
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGlAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8BP//Z"
      onError={() => {
        if (phase === "library" && icon) setPhase("icon");
        else setPhase("none");
      }}
    />
  );
}

export function GameCard({ game }: { game: PerGameProgress }) {
  const completed = game.total > 0 && game.unlocked === game.total;

  return (
    <Link
      href={`/games/${game.appid}`}
      className={`group block overflow-hidden rounded-xl border bg-surface shadow-sm transition ${
        completed
          ? "border-gold/30 hover:border-gold/60 hover:shadow-glow-gold"
          : "border-border hover:border-accent/40 hover:shadow-glow-accent"
      }`}
    >
      <div className="scanlines relative aspect-[2/3] w-full overflow-hidden bg-black/40">
        <GameCoverImage appid={game.appid} imgIconUrl={game.img_icon_url} />
        {completed ? (
          <div className="absolute right-2 top-2 rounded-full bg-gold px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-bg shadow-glow-gold">
            100%
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-3">
        <p className="line-clamp-2 font-display text-sm font-semibold leading-snug text-zinc-100">
          {game.name}
        </p>
        <p className="font-mono text-xs text-zinc-600">
          {(game.playtime_forever / 60).toFixed(1)}h played
        </p>
        {game.total > 0 ? (
          <>
            <ProgressBar value={game.unlocked} max={game.total} />
            <p className={`font-mono text-xs ${completed ? "text-gold" : "text-accent"}`}>
              {game.unlocked}/{game.total} · {game.completionPct}%
            </p>
          </>
        ) : (
          <p className="font-mono text-xs text-zinc-600">No achievements</p>
        )}
      </div>
    </Link>
  );
}
