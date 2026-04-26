"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/apiClient";
import type { SearchRow } from "@/lib/steam/achievementQueries";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PaginationBar } from "@/components/ui/PaginationBar";

export default function SearchPage() {
  return (
    <RequireAuth>
      <SearchInner />
    </RequireAuth>
  );
}

const PAGE_SIZE = 20;

function SearchInner() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!debounced) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await authedFetch(
          `/api/steam/achievement-search?q=${encodeURIComponent(debounced)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { results: SearchRow[] };
        if (!cancelled) setRows(data.results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    setPage((p) => Math.min(p, tp));
  }, [rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage],
  );

  return (
    <div className="space-y-6">
      <header className="page-header">
        <h1 className="font-display text-3xl font-bold text-white">Achievement search</h1>
        <p className="text-sm text-zinc-500">Search achievement names across your entire library.</p>
      </header>
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 font-display text-lg text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          placeholder="Start typing…"
          aria-label="Search achievements"
          autoFocus
        />
        {loading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        ) : null}
      </div>
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        total={rows.length}
        onPageChange={setPage}
      />
      <ul className="space-y-3">
        {pagedRows.map((r) => (
          <li
            key={`${r.appid}-${r.apiname}`}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-white">{r.displayName}</p>
              <p className="truncate font-mono text-xs text-zinc-500">{r.gameName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RarityBadge percent={r.rarityPct} />
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase ${
                  r.unlocked ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {r.unlocked ? "Unlocked" : "Locked"}
              </span>
              <Link href={`/games/${r.appid}`} className="text-xs text-accent underline">
                Open
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {!loading && debounced && rows.length === 0 ? (
        <p className="font-mono text-sm text-zinc-500">No matches.</p>
      ) : null}
    </div>
  );
}
