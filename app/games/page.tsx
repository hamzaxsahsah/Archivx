"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadDashboardBundle } from "@/lib/steam/dashboardBundleClient";
import type { DashboardBundle } from "@/lib/steam/dashboardStats";
import { getAuthClient } from "@/lib/firebase";
import { readCache } from "@/lib/offlineCache";
import { useSteamStore } from "@/lib/store";
import { GameCard } from "@/components/GameCard";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { PaginationBar } from "@/components/ui/PaginationBar";

type Filter = "all" | "completed" | "progress" | "notstarted";
type SortKey = "playtime" | "completion" | "lastplayed" | "name";

const PAGE_SIZE = 24;

export default function GamesPage() {
  return (
    <RequireAuth>
      <GamesInner />
    </RequireAuth>
  );
}

function GamesInner() {
  const profile = useSteamStore((s) => s.profile);
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("playtime");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = getAuthClient().currentUser;
      if (!u) {
        if (!cancelled) setError("LOAD");
        return;
      }

      const stale = readCache<DashboardBundle>(`dash:${u.uid}`);
      if (stale && !cancelled) {
        setBundle(stale);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const key = `${u.uid}:${profile?.steamId ?? ""}`;
        const outcome = await loadDashboardBundle(key);
        if (!outcome.ok) {
          if ("notLinked" in outcome) {
            if (!cancelled) setError("STEAM_NOT_LINKED");
            return;
          }
          throw new Error(outcome.error);
        }
        if (!cancelled) setBundle(outcome.bundle);
      } catch {
        if (!stale && !cancelled) setError("LOAD");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.steamId]);

  const filtered = useMemo(() => {
    if (!bundle) return [];
    let rows = bundle.perGame.filter((g) =>
      g.name.toLowerCase().includes(q.trim().toLowerCase()),
    );
    if (filter === "completed") {
      rows = rows.filter((g) => g.total > 0 && g.unlocked === g.total);
    } else if (filter === "progress") {
      rows = rows.filter((g) => g.total > 0 && g.unlocked > 0 && g.unlocked < g.total);
    } else if (filter === "notstarted") {
      rows = rows.filter((g) => g.total > 0 && g.unlocked === 0);
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sort === "playtime") return b.playtime_forever - a.playtime_forever;
      if (sort === "completion") return b.completionPct - a.completionPct;
      if (sort === "lastplayed") return b.rtime_last_played - a.rtime_last_played;
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [bundle, q, filter, sort]);

  useEffect(() => {
    setPage(1);
  }, [q, filter, sort]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    setPage((p) => Math.min(p, tp));
  }, [filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedGames = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  if (error === "STEAM_NOT_LINKED") {
    return (
      <div className="glass-panel">
        <p className="mb-4 text-zinc-300">Link your Steam account in Settings to browse your library.</p>
        <Link href="/settings" className="text-accent underline">
          Settings
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error || !bundle) {
    return <p className="text-red-400">Could not load library.</p>;
  }

  if (bundle.privateProfile) {
    return (
      <p className="text-amber-200">
        Your Steam game details may be private — make your profile and game details public in Steam.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <h1 className="font-display text-3xl font-bold text-white">Game library</h1>
        <p className="text-sm text-zinc-500">{bundle.gamesOwned} games in your Steam library</p>
      </header>

      <div className="glass-panel-sm">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="form-input w-full"
              placeholder="Filter by title…"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
            <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Filter
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Filter)}
                className="form-input"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="progress">In progress</option>
                <option value="notstarted">Not started</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="form-input"
              >
                <option value="playtime">Playtime</option>
                <option value="completion">Completion %</option>
                <option value="lastplayed">Last played</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {pagedGames.map((g) => (
          <GameCard key={g.appid} game={g} />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-center font-mono text-sm text-zinc-500">No games match your filters.</p>
      ) : null}
    </div>
  );
}
