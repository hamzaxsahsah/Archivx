"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/apiClient";
import {
  AchievementCard,
  type AchievementRowView,
} from "@/components/achievements/AchievementCard";
import { steamGameBannerUrls } from "@/lib/steam/steamImages";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PaginationBar } from "@/components/ui/PaginationBar";

type FilterMode = "all" | "unlocked" | "locked";

const ACH_PAGE_SIZE = 40;

export default function GameDetailPage() {
  return (
    <RequireAuth>
      <GameDetailInner />
    </RequireAuth>
  );
}

function GameBannerImage({ appId }: { appId: number }) {
  const urls = useMemo(() => [...steamGameBannerUrls(appId)], [appId]);
  const [index, setIndex] = useState(0);
  const src = urls[index] ?? urls[0];

  return (
    <Image
      src={src}
      alt=""
      fill
      className="object-cover opacity-90"
      sizes="(max-width: 768px) 100vw, min(1200px, 100vw)"
      priority
      quality={90}
      onError={() => {
        setIndex((i) => (i + 1 < urls.length ? i + 1 : i));
      }}
    />
  );
}

function GameDetailInner() {
  const params = useParams();
  const appId = Number(params?.appId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AchievementRowView[]>([]);
  const [gameName, setGameName] = useState("");
  const [playtime, setPlaytime] = useState(0);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<FilterMode>("all");
  const [achPage, setAchPage] = useState(1);

  useEffect(() => {
    if (!Number.isFinite(appId)) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch(`/api/steam/game/${appId}`);
        if (!res.ok) {
          const j = await res.json();
          throw new Error((j as { error?: string }).error ?? "Request failed");
        }
        const { schema: schemaJson, player: achJson, global: rareJson, game } =
          await res.json() as {
            schema: { game?: { gameName?: string; availableGameStats?: { achievements?: { name: string; displayName: string; description: string; icon: string; icongray: string }[] } } };
            player: { playerstats?: { achievements?: { apiname: string; achieved: number; unlocktime?: number }[]; error?: string } };
            global: { achievementpercentages?: { achievements?: { name: string; percent: number }[] } };
            game: { name: string; playtime_forever: number } | null;
          };

        if (game) {
          setGameName(game.name);
          setPlaytime(game.playtime_forever);
        }

        const list = schemaJson.game?.availableGameStats?.achievements ?? [];
        if (!list.length) {
          if (!cancelled) {
            setRows([]);
            setGameName(schemaJson.game?.gameName ?? "");
            setError("NO_ACHIEVEMENTS");
          }
          return;
        }

        const globalMap = new Map<string, number>();
        const ga = rareJson.achievementpercentages?.achievements;
        if (ga) {
          for (const x of ga) globalMap.set(x.name, x.percent);
        }

        const playerMap = new Map<string, { achieved: number; unlocktime?: number }>();
        const pa = achJson.playerstats?.achievements;
        if (pa) {
          for (const a of pa) playerMap.set(a.apiname, { achieved: a.achieved, unlocktime: a.unlocktime });
        }

        const merged: AchievementRowView[] = list.map((s) => {
          const p = playerMap.get(s.name);
          return {
            apiname: s.name,
            displayName: s.displayName,
            description: s.description,
            icon: s.icon,
            icongray: s.icongray,
            achieved: p?.achieved === 1,
            unlocktime: p?.unlocktime,
            rarityPct: globalMap.get(s.name) ?? null,
          };
        });
        if (!cancelled) {
          setRows(merged);
          setGameName((prev) => prev || schemaJson.game?.gameName || "");
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load game");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (mode === "unlocked" && !r.achieved) return false;
      if (mode === "locked" && r.achieved) return false;
      if (
        qq &&
        !r.displayName.toLowerCase().includes(qq) &&
        !r.apiname.toLowerCase().includes(qq)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, q, mode]);

  useEffect(() => {
    setAchPage(1);
  }, [q, mode, appId]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filtered.length / ACH_PAGE_SIZE));
    setAchPage((p) => Math.min(p, tp));
  }, [filtered.length]);

  const achTotalPages = Math.max(1, Math.ceil(filtered.length / ACH_PAGE_SIZE));
  const achSafePage = Math.min(achPage, achTotalPages);
  const pagedAch = filtered.slice(
    (achSafePage - 1) * ACH_PAGE_SIZE,
    achSafePage * ACH_PAGE_SIZE,
  );

  const unlocked = rows.filter((r) => r.achieved).length;

  if (loading) {
    return <SkeletonList rows={8} />;
  }

  if (error && error !== "NO_ACHIEVEMENTS") {
    return <p className="text-red-400">{error}</p>;
  }

  if (error === "NO_ACHIEVEMENTS") {
    return (
      <div className="glass-panel">
        <h1 className="mb-2 font-display text-2xl font-bold text-white">{gameName || "Game"}</h1>
        <p className="text-zinc-400">This game has no achievements or stats are unavailable from Steam.</p>
        <Link href="/games" className="mt-4 inline-block text-accent underline">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative h-40 w-full md:h-52">
          <GameBannerImage appId={appId} />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        </div>
        <div className="flex flex-col gap-3 px-4 pb-5 pt-3 sm:px-6 sm:pb-6 sm:pt-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold text-white sm:text-3xl">{gameName}</h1>
            <p className="font-mono text-xs text-zinc-500 sm:text-sm">
              {(playtime / 60).toFixed(1)}h played ·{" "}
              <span className="text-accent">
                {unlocked}/{rows.length}
              </span>{" "}
              unlocked
            </p>
          </div>
          <div className="w-full max-w-xs pt-1 sm:max-w-sm sm:pt-2">
            <ProgressBar value={unlocked} max={rows.length || 1} />
          </div>
        </div>
      </div>

      <div className="glass-panel-sm flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex flex-1 flex-col gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Search achievements
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="form-input"
            placeholder="Filter by name…"
          />
        </label>
        <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-wrap">
          {(["all", "unlocked", "locked"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-3 py-2 font-display text-xs transition ${
                mode === m
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-border text-zinc-400 hover:border-white/15 hover:bg-white/5 hover:text-white"
              }`}
            >
              {m === "all" ? "All" : m === "unlocked" ? "Unlocked" : "Locked"}
            </button>
          ))}
        </div>
      </div>

      <PaginationBar
        page={achPage}
        pageSize={ACH_PAGE_SIZE}
        total={filtered.length}
        onPageChange={setAchPage}
      />

      <div className="space-y-3">
        {pagedAch.map((r) => (
          <AchievementCard key={r.apiname} appId={appId} gameName={gameName} row={r} />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">No achievements match your filters.</p>
      ) : null}
    </div>
  );
}
