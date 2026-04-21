"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { authedFetch } from "@/lib/apiClient";
import type { RareRow } from "@/lib/achievementQueries";
import { RequireAuth } from "@/components/RequireAuth";
import { RarityBadge } from "@/components/RarityBadge";
import { SkeletonList } from "@/components/SkeletonCard";
import { PaginationBar } from "@/components/PaginationBar";
import { steamAchievementIconUrl } from "@/lib/steamImages";

export default function RarePage() {
  return (
    <RequireAuth>
      <RareInner />
    </RequireAuth>
  );
}

const PAGE_SIZE = 24;

function RareInner() {
  const [rows, setRows] = useState<RareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await authedFetch("/api/steam/rare-list");
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? "Failed");
        }
        const data = (await res.json()) as { achievements: RareRow[] };
        if (!cancelled) setRows(data.achievements);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <SkeletonList rows={10} />;

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (error) {
    return (
      <p className="text-red-400">
        {error === "STEAM_NOT_LINKED" ? (
          <>
            Link Steam in{" "}
            <Link href="/settings" className="text-accent underline">
              Settings
            </Link>
            .
          </>
        ) : (
          error
        )}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <h1 className="font-display text-3xl font-bold text-white">Rare showcase</h1>
        <p className="text-sm text-zinc-500">
          Achievements you&apos;ve unlocked with a global rate under 5%, rarest first.
        </p>
      </header>
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        total={rows.length}
        onPageChange={setPage}
        className="mb-2"
      />
      <ul className="space-y-3">
        {paged.map((r) => (
          <li
            key={`${r.appid}-${r.apiname}`}
            className={`flex items-center gap-3 rounded-xl border p-3 transition sm:gap-4 sm:p-4 ${
              r.rarityPct !== null && r.rarityPct < 5
                ? "border-gold/30 bg-surface hover:border-gold/50 hover:shadow-glow-gold"
                : "border-border bg-surface hover:border-white/10"
            }`}
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-black/40 sm:h-14 sm:w-14">
              {r.icon ? (
                <Image
                  src={steamAchievementIconUrl(r.appid, r.icon)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                  quality={90}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-white">{r.displayName}</p>
              <p className="truncate font-mono text-xs text-zinc-500">{r.gameName}</p>
              <div className="mt-1.5">
                <RarityBadge percent={r.rarityPct} />
              </div>
            </div>
            <Link
              href={`/games/${r.appid}`}
              className="shrink-0 self-center text-xs text-accent underline"
            >
              View
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className="text-center font-mono text-sm text-zinc-500">
          No rare unlocks yet — keep chasing low global-rate achievements.
        </p>
      ) : null}
    </div>
  );
}
