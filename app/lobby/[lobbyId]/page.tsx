"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { authedFetch } from "@/lib/apiClient";
import type { AchievementLobby, LobbyMessage } from "@/lib/lobby/lobbyTypes";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { steamAchievementIconUrl } from "@/lib/steam/steamImages";
import { getAuthClient } from "@/lib/firebase";

export default function LobbyDetailPage() {
  return (
    <RequireAuth>
      <LobbyDetailInner />
    </RequireAuth>
  );
}

function Avatar({
  src,
  name,
  size = 32,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border border-white/10 object-cover"
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-accent/20"
      style={{ width: size, height: size }}
    >
      <span className="font-mono text-[10px] text-accent">
        {name[0]?.toUpperCase() ?? "?"}
      </span>
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
    open: "Open — looking for players",
    full: "Full — group complete",
    done: "Done",
    cancelled: "Cancelled",
  };
  return (
    <span className={`rounded-full border px-3 py-1 font-mono text-xs ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function LobbyDetailInner() {
  const params = useParams();
  const router = useRouter();
  const lobbyId = params?.lobbyId as string;
  const currentUid = getAuthClient().currentUser?.uid ?? "";

  const [lobby, setLobby] = useState<AchievementLobby | null>(null);
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [loadingLobby, setLoadingLobby] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLobby = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/lobby/${lobbyId}`);
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Lobby not found");
      }
      const { lobby: l } = (await res.json()) as { lobby: AchievementLobby };
      setLobby(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoadingLobby(false);
    }
  }, [lobbyId]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/lobby/${lobbyId}/messages`);
      if (!res.ok) return;
      const { messages: msgs } = (await res.json()) as { messages: LobbyMessage[] };
      setMessages(msgs);
    } catch {
      /* ignore polling errors */
    }
  }, [lobbyId]);

  useEffect(() => {
    fetchLobby();
    fetchMessages();
  }, [fetchLobby, fetchMessages]);

  // Poll messages every 4 seconds when lobby is active
  useEffect(() => {
    if (!lobby) return;
    if (lobby.status === "done" || lobby.status === "cancelled") return;
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages, lobby]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleJoin() {
    setActionLoading(true);
    try {
      const res = await authedFetch(`/api/lobby/${lobbyId}/join`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Failed to join");
      }
      await fetchLobby();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Leave this lobby?")) return;
    setActionLoading(true);
    try {
      const res = await authedFetch(`/api/lobby/${lobbyId}/leave`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Failed to leave");
      }
      router.push("/lobby");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
      setActionLoading(false);
    }
  }

  async function handleStatus(status: "done" | "cancelled") {
    const label = status === "done" ? "mark as done" : "cancel";
    if (!confirm(`Are you sure you want to ${label} this lobby?`)) return;
    setActionLoading(true);
    try {
      const res = await authedFetch(`/api/lobby/${lobbyId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Failed");
      }
      await fetchLobby();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgText.trim()) return;
    setSendingMsg(true);
    try {
      const res = await authedFetch(`/api/lobby/${lobbyId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: msgText.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Failed to send");
      }
      setMsgText("");
      await fetchMessages();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSendingMsg(false);
    }
  }

  if (loadingLobby) {
    return (
      <div className="space-y-4">
        <div className="h-36 w-full animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-64 w-full animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
    );
  }

  if (error || !lobby) {
    return (
      <div className="glass-panel">
        <p className="text-red-400">{error ?? "Lobby not found."}</p>
        <Link href="/lobby" className="mt-3 inline-block text-sm text-accent underline">
          Back to lobbies
        </Link>
      </div>
    );
  }

  const isMember = Boolean(lobby.playerUids[currentUid]);
  const isCreator = lobby.creatorUid === currentUid;
  const isActive = lobby.status === "open" || lobby.status === "full";
  const iconSrc = lobby.icon ? steamAchievementIconUrl(lobby.appId, lobby.icon) : "";
  const scheduledDate = lobby.scheduledAt
    ? new Date(lobby.scheduledAt).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/lobby" className="font-mono text-xs text-zinc-500 hover:text-white">
          ← Lobbies
        </Link>
      </div>

      {/* Achievement + lobby info */}
      <div className="glass-panel space-y-4">
        <div className="flex items-start gap-4">
          {iconSrc ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/40">
              <Image src={iconSrc} alt="" fill className="object-cover" sizes="56px" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-2">
              <h1 className="font-display text-xl font-bold text-white [overflow-wrap:anywhere]">
                {lobby.achievementName}
              </h1>
              <RarityBadge percent={lobby.rarityPct} />
            </div>
            <p className="mt-0.5 font-mono text-sm text-zinc-500">
              <Link href={`/games/${lobby.appId}`} className="hover:text-accent hover:underline">
                {lobby.gameName}
              </Link>
            </p>
            <div className="mt-2">
              <StatusBadge status={lobby.status} />
            </div>
          </div>
        </div>

        {lobby.note ? (
          <p className="rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-zinc-300">
            {lobby.note}
          </p>
        ) : null}

        {scheduledDate ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Scheduled: <strong className="text-accent">{scheduledDate}</strong></span>
          </div>
        ) : null}

        {/* Slots */}
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Players ({lobby.players.length}/{lobby.requiredPlayers})
          </p>
          <div className="flex flex-wrap gap-3">
            {lobby.players.map((p) => (
              <div key={p.uid} className="flex items-center gap-2">
                <Avatar src={p.photoURL} name={p.displayName} size={32} />
                <div>
                  <p className="font-display text-xs text-white">{p.displayName}</p>
                  {p.uid === lobby.creatorUid ? (
                    <p className="font-mono text-[10px] text-accent">Host</p>
                  ) : null}
                </div>
              </div>
            ))}
            {Array.from({
              length: Math.max(0, lobby.requiredPlayers - lobby.players.length),
            }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-2 opacity-40">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <p className="font-mono text-xs text-zinc-500">Empty slot</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {isActive ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {!isMember && lobby.status === "open" ? (
              <button
                type="button"
                onClick={handleJoin}
                disabled={actionLoading}
                className="btn-primary disabled:opacity-60"
              >
                {actionLoading ? "Joining…" : "Join lobby"}
              </button>
            ) : null}
            {isMember && !isCreator ? (
              <button
                type="button"
                onClick={handleLeave}
                disabled={actionLoading}
                className="btn-ghost text-red-400 hover:text-red-300 disabled:opacity-60"
              >
                Leave
              </button>
            ) : null}
            {isCreator ? (
              <>
                <button
                  type="button"
                  onClick={() => handleStatus("done")}
                  disabled={actionLoading}
                  className="btn-primary disabled:opacity-60"
                >
                  Mark done
                </button>
                <button
                  type="button"
                  onClick={() => handleStatus("cancelled")}
                  disabled={actionLoading}
                  className="btn-ghost text-red-400 hover:text-red-300 disabled:opacity-60"
                >
                  Cancel lobby
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Group chat */}
      <div className="glass-panel flex flex-col">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Group chat</h2>

        {!isMember ? (
          <p className="text-sm text-zinc-500">Join the lobby to participate in chat.</p>
        ) : (
          <>
            <div className="mb-4 max-h-80 overflow-y-auto space-y-3 pr-1">
              {messages.length === 0 ? (
                <p className="text-sm text-zinc-500">No messages yet. Say hello!</p>
              ) : (
                messages.map((m) => {
                  const isMe = m.authorUid === currentUid;
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                    >
                      <div className="shrink-0">
                        <Avatar src={m.authorPhoto} name={m.authorName} size={28} />
                      </div>
                      <div className={`max-w-[75%] space-y-0.5 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                        <p className={`font-mono text-[10px] text-zinc-500 ${isMe ? "text-right" : ""}`}>
                          {isMe ? "You" : m.authorName}
                        </p>
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm ${
                            isMe
                              ? "rounded-tr-sm bg-accent/20 text-white"
                              : "rounded-tl-sm bg-white/5 text-zinc-200"
                          }`}
                        >
                          {m.text}
                        </div>
                        <p className="font-mono text-[9px] text-zinc-600">
                          {new Date(m.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {isActive ? (
              <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/5 pt-3">
                <input
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Type a message…"
                  maxLength={1000}
                  className="form-input flex-1"
                  disabled={sendingMsg}
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !msgText.trim()}
                  className="btn-primary shrink-0 px-4 disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            ) : (
              <p className="border-t border-white/5 pt-3 text-xs text-zinc-500">
                This lobby is {lobby.status}. Chat is read-only.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
