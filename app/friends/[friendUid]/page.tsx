"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/apiClient";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { useSteamStore } from "@/lib/store";

type Card = {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  steamLinked: boolean;
};

type Overview = {
  card: Card;
  steamLinked: boolean;
  bundle: {
    gamesOwned: number;
    totalUnlocked: number;
    totalAvailable: number;
    completionPct: number;
    rareUnlocked: number;
    privateProfile: boolean;
    recentUnlocks: {
      appid: number;
      gameName: string;
      displayName: string;
      unlocktime: number;
      rarityPct: number | null;
    }[];
    mostPlayed: {
      appid: number;
      name: string;
      playtimeHours: number;
      unlocked: number;
      total: number;
      completionPct: number;
    }[];
  } | null;
  message?: string;
};

type ChatMessage = { id: string; authorUid: string; text: string; createdAt: number };

export default function FriendProfilePage() {
  return (
    <RequireAuth>
      <FriendInner />
    </RequireAuth>
  );
}

function FriendInner() {
  const params = useParams();
  const friendUid = String(params?.friendUid ?? "");
  const myUid = useSteamStore((s) => s.user?.uid ?? "");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!friendUid) return;
    const res = await authedFetch(`/api/friends/${friendUid}/overview`);
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      throw new Error(j.error ?? "Failed");
    }
    setOverview((await res.json()) as Overview);
  }, [friendUid]);

  const loadMessages = useCallback(async () => {
    if (!friendUid) return;
    const res = await authedFetch(`/api/friends/${friendUid}/messages`);
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ChatMessage[] };
    setMessages(data.messages);
  }, [friendUid]);

  useEffect(() => {
    if (friendUid && friendUid === myUid) {
      setErr("SELF");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        await loadOverview();
        await loadMessages();
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Error";
        const friendly =
          raw === "NOT_FRIENDS"
            ? "You can only view friends you are connected with."
            : raw === "NOT_FOUND"
              ? "User not found."
              : raw;
        if (!cancelled) setErr(friendly);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [friendUid, myUid, loadOverview, loadMessages]);

  const sendMessage = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const res = await authedFetch(`/api/friends/${friendUid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (res.ok) {
        setText("");
        await loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const unfriend = async () => {
    if (!confirm("Remove this friend and delete your chat history?")) return;
    const res = await authedFetch(`/api/friends/${friendUid}`, { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/friends";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-white/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (err === "SELF") {
    return (
      <div className="glass-panel space-y-4">
        <p className="text-zinc-300">Use your dashboard to see your own stats.</p>
        <Link href="/friends" className="text-accent underline">
          Back to friends
        </Link>
      </div>
    );
  }

  if (err || !overview) {
    return (
      <div className="glass-panel space-y-4">
        <p className="text-red-300">{err ?? "Not found"}</p>
        <Link href="/friends" className="text-accent underline">
          Back to friends
        </Link>
      </div>
    );
  }

  const b = overview.bundle;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/friends" className="mb-2 inline-block font-mono text-xs text-accent hover:underline">
            ← Friends
          </Link>
          <h1 className="font-display text-3xl font-bold text-white">
            {overview.card.displayName ?? "Friend"}
          </h1>
          <p className="font-mono text-xs text-zinc-500">{friendUid}</p>
        </div>
        <button type="button" onClick={unfriend} className="btn-danger text-xs">
          Remove friend
        </button>
      </div>

      <section className="glass-panel space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Achievement snapshot</h2>
        {!overview.steamLinked || !b ? (
          <p className="text-sm text-zinc-400">
            {overview.message ?? "Steam not linked — no achievement data to show."}
          </p>
        ) : b.privateProfile ? (
          <p className="text-amber-200">Their Steam library appears private.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Games" value={String(b.gamesOwned)} />
              <Stat label="Unlocked" value={`${b.totalUnlocked} / ${b.totalAvailable}`} />
              <Stat label="Completion" value={`${b.completionPct}%`} />
              <Stat label="Rare (&lt;5%)" value={String(b.rareUnlocked)} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 font-display text-sm font-semibold text-zinc-300">Recent unlocks</h3>
                <ul className="space-y-2">
                  {b.recentUnlocks.length === 0 ? (
                    <li className="text-xs text-zinc-500">None yet.</li>
                  ) : (
                    b.recentUnlocks.map((u) => (
                      <li
                        key={`${u.appid}-${u.displayName}-${u.unlocktime}`}
                        className="rounded-lg border border-white/5 bg-surface/50 px-3 py-2"
                      >
                        <p className="font-display text-xs text-white">{u.displayName}</p>
                        <p className="font-mono text-[10px] text-zinc-500">{u.gameName}</p>
                        <div className="mt-1">
                          <RarityBadge percent={u.rarityPct} />
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-display text-sm font-semibold text-zinc-300">Most played</h3>
                <ul className="space-y-2">
                  {b.mostPlayed.map((g) => (
                    <li key={g.appid} className="font-mono text-xs text-zinc-300">
                      <span className="text-white">{g.name}</span> · {g.playtimeHours}h ·{" "}
                      {g.unlocked}/{g.total} ({g.completionPct}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="glass-panel flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-white">Discussion</h2>
        <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto rounded-xl border border-border bg-bg/50 p-3">
          {messages.length === 0 ? (
            <p className="text-center font-mono text-xs text-zinc-500">No messages yet — say hi.</p>
          ) : (
            messages.map((m) => {
              const mine = m.authorUid === myUid;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-accent/20 text-zinc-100"
                        : "border border-white/10 bg-surface/80 text-zinc-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className="mt-1 font-mono text-[9px] opacity-60">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Write a message…"
            className="form-input min-h-[4rem] flex-1 resize-y font-sans"
          />
          <button
            type="button"
            disabled={sending || !text.trim()}
            onClick={sendMessage}
            className="btn-primary shrink-0 self-end sm:self-stretch"
          >
            Send
          </button>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface/40 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="font-mono text-lg text-white">{value}</p>
    </div>
  );
}
