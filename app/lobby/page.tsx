"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authedFetch } from "@/lib/apiClient";
import type { AchievementLobby } from "@/lib/lobby/lobbyTypes";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { LobbyCard } from "@/components/lobby/LobbyCard";
import {
  CreateLobbyModal,
  type CreateLobbyData,
} from "@/components/lobby/CreateLobbyModal";
import { SkeletonList } from "@/components/ui/SkeletonCard";

export default function LobbyPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<SkeletonList rows={6} />}>
        <LobbyInner />
      </Suspense>
    </RequireAuth>
  );
}

function LobbyInner() {
  const searchParams = useSearchParams();
  const [lobbies, setLobbies] = useState<AchievementLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState("");
  const [createData, setCreateData] = useState<CreateLobbyData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch("/api/lobby");
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Failed to load lobbies");
      }
      const { lobbies: rows } = (await res.json()) as { lobbies: AchievementLobby[] };
      setLobbies(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-open create modal when navigated from guide panel
  useEffect(() => {
    const appId = searchParams.get("appId");
    const apiname = searchParams.get("apiname");
    const achievementName = searchParams.get("achievementName");
    const gameName = searchParams.get("gameName");
    if (appId && apiname && achievementName && gameName) {
      setCreateData({
        appId: Number(appId),
        apiname,
        achievementName: decodeURIComponent(achievementName),
        gameName: decodeURIComponent(gameName),
        icon: searchParams.get("icon") ?? "",
        rarityPct: searchParams.get("rarityPct")
          ? Number(searchParams.get("rarityPct"))
          : null,
      });
    }
  }, [searchParams]);

  const filtered = gameFilter.trim()
    ? lobbies.filter((l) =>
        l.gameName.toLowerCase().includes(gameFilter.trim().toLowerCase()),
      )
    : lobbies;

  return (
    <div className="space-y-6">
      <header className="page-header">
        <h1 className="font-display text-3xl font-bold text-white">Co-op Lobbies</h1>
        <p className="text-sm text-zinc-500">
          Find players to team up on multiplayer achievements. Open an achievement
          guide and tap <strong className="text-zinc-400">Find Players</strong> to
          create a lobby.
        </p>
      </header>

      <div className="glass-panel-sm">
        <input
          value={gameFilter}
          onChange={(e) => setGameFilter(e.target.value)}
          className="form-input w-full"
          placeholder="Filter by game name…"
        />
      </div>

      {error ? <p className="text-red-400">{error}</p> : null}

      {loading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <div className="glass-panel text-center">
          <p className="mb-1 font-display text-lg text-white">No open lobbies</p>
          <p className="text-sm text-zinc-500">
            {gameFilter
              ? "No lobbies match that game."
              : "No active lobbies right now. Open an achievement guide panel to create one."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((l) => (
            <li key={l.id}>
              <LobbyCard lobby={l} />
            </li>
          ))}
        </ul>
      )}

      {createData ? (
        <CreateLobbyModal
          data={createData}
          onClose={() => {
            setCreateData(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}
