"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getDb, getAuthClient } from "@/lib/firebase";
import {
  loadDashboardBundle,
} from "@/lib/steam/dashboardBundleClient";
import type { DashboardBundle, MostPlayedRow, RecentUnlock } from "@/lib/steam/dashboardStats";
import { readCache, writeCache } from "@/lib/offlineCache";
import { useSteamStore } from "@/lib/store";
import { AchievementGuidePanel } from "@/components/achievements/AchievementGuidePanel";
import { RequireAuth } from "@/components/layout/RequireAuth";
import type { SnapshotPoint } from "@/components/ui/ProgressChart";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { RankBadge } from "@/components/ui/RankBadge";
import { CompletionRing } from "@/components/ui/CompletionRing";

/** Recharts pulls browser-only APIs; SSR + dev HMR can trigger obscure webpack `JSON.parse` / `.call` errors. */
const ProgressChartLazy = dynamic(
  () => import("@/components/ui/ProgressChart").then((m) => m.ProgressChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl border border-border bg-surface/50" aria-hidden />
    ),
  },
);

const RECENT_PAGE = 8;
const MOST_PLAYED_PAGE = 10;

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const profile = useSteamStore((s) => s.profile);
  const setOffline = useSteamStore((s) => s.setOffline);
  const [data, setData] = useState<DashboardBundle | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [pageRecent, setPageRecent] = useState(1);
  const [pageMost, setPageMost] = useState(1);
  const [expandedUnlock, setExpandedUnlock] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    const u = getAuthClient().currentUser;
    if (!u) return;
    const db = getDb();
    const ref = collection(db, "users", u.uid, "snapshots");
    const snap = await getDocs(ref);
    const rows = snap.docs
      .map((d) => {
        const x = d.data() as { totalUnlocked?: number };
        return { date: d.id, totalUnlocked: x.totalUnlocked ?? 0 };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    setSnapshots(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = getAuthClient().currentUser;
      if (!u) return;

      const stale = readCache<DashboardBundle>(`dash:${u.uid}`);
      if (stale && !cancelled) {
        setData(stale);
        setLoading(false);
      } else {
        setLoading(true);
      }

      setError(null);
      try {
        const key = `${u.uid}:${profile?.steamId ?? ""}`;
        const outcome = await loadDashboardBundle(key);
        if (!outcome.ok) {
          if ("notLinked" in outcome) {
            setError("STEAM_NOT_LINKED");
            setData(null);
            return;
          }
          setError(outcome.error);
          return;
        }
        const bundle = outcome.bundle;
        if (!cancelled) {
          setData(bundle);
          setCached(false);
          writeCache(`dash:${u.uid}`, bundle);
          setOffline(false);
          const today = new Date().toISOString().slice(0, 10);
          const completed = bundle.perGame.filter(
            (p) => p.total > 0 && p.unlocked === p.total,
          ).length;
          await setDoc(
            doc(getDb(), "users", u.uid, "snapshots", today),
            {
              totalUnlocked: bundle.totalUnlocked,
              totalGames: bundle.gamesOwned,
              completedGames: completed,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
          await loadSnapshots();
        }
      } catch (e) {
        if (stale) {
          setCached(true);
          setOffline(true);
        } else {
          setError(e instanceof Error ? e.message : "Could not load dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSnapshots, profile?.steamId, setOffline]);

  useEffect(() => {
    setPageRecent(1);
    setPageMost(1);
  }, [data?.gamesOwned, data?.totalUnlocked]);

  const recentSlice = useMemo(() => {
    if (!data) {
      return { page: 1, items: [] as RecentUnlock[], total: 0, totalPages: 1 };
    }
    const totalPages = Math.max(1, Math.ceil(data.recentUnlocks.length / RECENT_PAGE));
    const p = Math.min(pageRecent, totalPages);
    const start = (p - 1) * RECENT_PAGE;
    return {
      page: p,
      items: data.recentUnlocks.slice(start, start + RECENT_PAGE),
      total: data.recentUnlocks.length,
      totalPages,
    };
  }, [data, pageRecent]);

  const mostSlice = useMemo(() => {
    if (!data) {
      return { page: 1, items: [] as MostPlayedRow[], total: 0, totalPages: 1 };
    }
    const totalPages = Math.max(1, Math.ceil(data.mostPlayed.length / MOST_PLAYED_PAGE));
    const p = Math.min(pageMost, totalPages);
    const start = (p - 1) * MOST_PLAYED_PAGE;
    return {
      page: p,
      items: data.mostPlayed.slice(start, start + MOST_PLAYED_PAGE),
      total: data.mostPlayed.length,
      totalPages,
    };
  }, [data, pageMost]);

  if (!profile) {
    return <p className="font-mono text-sm text-zinc-500">Loading profile…</p>;
  }

  if (error === "STEAM_NOT_LINKED") {
    return (
      <div className="glass-panel border-accent/20">
        <h1 className="mb-2 font-display text-2xl font-bold text-white">Link Steam</h1>
        <p className="mb-4 text-zinc-400">
          Connect your Steam account in Settings to load games and achievements.
        </p>
        <Link href="/settings" className="btn-primary">
          Open Settings
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-red-400">{error}</p>;
  }

  if (data.privateProfile) {
    return (
      <div className="glass-panel border-amber-500/30">
        <h1 className="mb-2 font-display text-2xl font-bold text-amber-200">Steam profile appears private</h1>
        <p className="text-zinc-300">
          Steam did not return your owned games. Set your Steam profile to <strong>Public</strong> and
          under Privacy Settings set <strong>Game details</strong> to Public so the Web API can list
          your library.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {cached ? (
        <p className="animate-slide-down rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 font-mono text-xs text-gold">
          Showing cached dashboard data (offline or server unreachable).
        </p>
      ) : null}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
            <RankBadge completionPct={data.completionPct} />
          </div>
          <p className="text-sm text-zinc-500">Snapshot of your library and unlock velocity.</p>
        </div>
        <CompletionRing value={data.totalUnlocked} max={data.totalAvailable} size={80} />
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatGlass label="Games owned" value={String(data.gamesOwned)} />
        <StatGlass
          label="Achievements"
          value={`${data.totalUnlocked} / ${data.totalAvailable}`}
          accent
        />
        <StatGlass label="Completion" value={`${data.completionPct}%`} accent />
        <StatGlass label="Rare (<5%)" value={String(data.rareUnlocked)} gold />
      </section>

      <section className="glass-panel">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Unlock trend</h2>
        <ProgressChartLazy data={snapshots} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Recent unlocks</h2>
          <PaginationBar
            page={recentSlice.page}
            pageSize={RECENT_PAGE}
            total={recentSlice.total}
            onPageChange={setPageRecent}
            className="mb-3"
          />
          <ul className="space-y-1">
            {data.recentUnlocks.length === 0 ? (
              <li className="text-sm text-zinc-500">No recent unlocks found.</li>
            ) : (
              recentSlice.items.map((r) => {
                const itemKey = `${r.appid}-${r.apiname}-${r.unlocktime}`;
                const expanded = expandedUnlock === itemKey;
                return (
                  <li
                    key={itemKey}
                    className="rounded-lg border border-transparent transition hover:border-white/5 hover:bg-white/3"
                  >
                    <div className="flex items-center gap-2 px-1 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm text-white">{r.displayName}</p>
                        <p className="truncate font-mono text-xs text-zinc-500">{r.gameName}</p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-accent">
                        {new Date(r.unlocktime * 1000).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => setExpandedUnlock(expanded ? null : itemKey)}
                        aria-label={expanded ? "Collapse guide" : "Show guide"}
                        className="shrink-0 rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                    {expanded && <AchievementGuidePanel achievement={r} />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
        <div className="glass-panel">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Most played</h2>
          <PaginationBar
            page={mostSlice.page}
            pageSize={MOST_PLAYED_PAGE}
            total={mostSlice.total}
            onPageChange={setPageMost}
            className="mb-3"
          />
          <ul className="space-y-3">
            {mostSlice.items.map((g) => (
              <li key={g.appid} className="flex min-w-0 items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/games/${g.appid}`} className="block truncate font-display text-sm text-accent hover:underline">
                    {g.name}
                  </Link>
                  <p className="font-mono text-xs text-zinc-500">
                    {g.playtimeHours}h · {g.unlocked}/{g.total} ({g.completionPct}%)
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function StatGlass({
  label,
  value,
  accent = false,
  gold = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="glass-panel flex flex-col gap-2 p-4">
      <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">{label}</span>
      <span
        className={`font-display text-2xl font-bold leading-none sm:text-3xl ${
          gold ? "text-gold" : accent ? "text-accent" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
