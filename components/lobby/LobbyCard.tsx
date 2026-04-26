"use client";

import Image from "next/image";
import Link from "next/link";
import type { AchievementLobby } from "@/lib/lobby/lobbyTypes";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { steamAchievementIconUrl } from "@/lib/steam/steamImages";

function SlotPips({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${i < filled ? "bg-accent" : "bg-white/15"}`}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: AchievementLobby["status"] }) {
  const styles: Record<AchievementLobby["status"], string> = {
    open: "bg-green-500/15 text-green-400 border-green-500/30",
    full: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    done: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels: Record<AchievementLobby["status"], string> = {
    open: "Open",
    full: "Full",
    done: "Done",
    cancelled: "Cancelled",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function LobbyCard({ lobby }: { lobby: AchievementLobby }) {
  const iconSrc = lobby.icon ? steamAchievementIconUrl(lobby.appId, lobby.icon) : "";
  const scheduledDate = lobby.scheduledAt
    ? new Date(lobby.scheduledAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const creator = lobby.players[0];

  return (
    <Link
      href={`/lobby/${lobby.id}`}
      className="block rounded-xl border border-border bg-surface transition hover:border-accent/30 hover:bg-surface/80"
    >
      <div className="flex gap-3 p-4">
        {iconSrc ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-black/40">
            <Image src={iconSrc} alt="" fill className="object-cover" sizes="48px" />
          </div>
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-md bg-white/5" />
        )}

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
            <p className="font-display text-sm font-semibold text-white [overflow-wrap:anywhere]">
              {lobby.achievementName}
            </p>
            <RarityBadge percent={lobby.rarityPct} />
            <StatusBadge status={lobby.status} />
          </div>
          <p className="font-mono text-xs text-zinc-500">{lobby.gameName}</p>
          <div className="flex flex-wrap items-center gap-3">
            <SlotPips filled={lobby.players.length} total={lobby.requiredPlayers} />
            <span className="font-mono text-[11px] text-zinc-500">
              {lobby.players.length}/{lobby.requiredPlayers} players
            </span>
            {scheduledDate ? (
              <span className="font-mono text-[11px] text-accent/80">{scheduledDate}</span>
            ) : null}
          </div>
          {lobby.note ? (
            <p className="line-clamp-1 text-xs text-zinc-400">{lobby.note}</p>
          ) : null}
        </div>

        <div className="shrink-0 self-start pl-2">
          {creator?.photoURL ? (
            <Image
              src={creator.photoURL}
              alt={creator.displayName}
              width={26}
              height={26}
              className="rounded-full border border-white/10"
              title={`Created by ${creator.displayName}`}
            />
          ) : (
            <div
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent/20"
              title={creator ? `Created by ${creator.displayName}` : ""}
            >
              <span className="font-mono text-[9px] text-accent">
                {creator?.displayName?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
