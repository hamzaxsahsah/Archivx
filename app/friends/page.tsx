"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/apiClient";
import { RequireAuth } from "@/components/RequireAuth";

type Card = {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  steamLinked: boolean;
};

type RequestRow = Card & { createdAt: number };

export default function FriendsPage() {
  return (
    <RequireAuth>
      <FriendsInner />
    </RequireAuth>
  );
}

function FriendsInner() {
  const [friends, setFriends] = useState<Card[]>([]);
  const [incoming, setIncoming] = useState<RequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [targetUid, setTargetUid] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await authedFetch("/api/friends");
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Failed");
      }
      const data = (await res.json()) as {
        friends: Card[];
        incoming: RequestRow[];
        outgoing: RequestRow[];
      };
      setFriends(data.friends);
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendRequest = async () => {
    const id = targetUid.trim();
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await authedFetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: id }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Could not send invite");
        return;
      }
      setTargetUid("");
      await load();
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  const respond = async (fromUid: string, accept: boolean) => {
    setBusy(true);
    try {
      const res = await authedFetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUid, accept }),
      });
      if (!res.ok) return;
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelOutgoing = async (toUid: string) => {
    setBusy(true);
    try {
      await authedFetch("/api/friends/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUid }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="page-header">
        <h1 className="font-display text-3xl font-bold text-white">Friends</h1>
        <p className="text-sm text-zinc-500">
          Invite by user ID (from Settings), compare progress, and chat after you&apos;re friends.
        </p>
      </header>

      {err ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-sm text-red-300">
          {err}
        </p>
      ) : null}

      <section className="glass-panel space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Send invite</h2>
        <p className="text-xs text-zinc-500">
          Ask your friend for their <strong className="text-zinc-400">AchievHQ user ID</strong> from
          Settings → Friends, then paste it here.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 font-mono text-xs text-zinc-500">
            Friend&apos;s user ID
            <input
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value)}
              placeholder="Firebase UID"
              className="form-input font-sans"
            />
          </label>
          <button
            type="button"
            disabled={busy || !targetUid.trim()}
            onClick={sendRequest}
            className="btn-primary shrink-0"
          >
            Send request
          </button>
        </div>
      </section>

      {incoming.length > 0 ? (
        <section className="glass-panel space-y-3">
          <h2 className="font-display text-lg font-semibold text-white">Incoming requests</h2>
          <ul className="space-y-2">
            {incoming.map((r) => (
              <li
                key={r.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3"
              >
                <div>
                  <p className="font-display text-sm text-white">{r.displayName ?? r.uid}</p>
                  <p className="font-mono text-[10px] text-zinc-600">{r.uid}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => respond(r.uid, true)}
                    className="btn-primary py-1.5 text-xs"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => respond(r.uid, false)}
                    className="btn-ghost py-1.5 text-xs"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section className="glass-panel space-y-3">
          <h2 className="font-display text-lg font-semibold text-white">Sent requests</h2>
          <ul className="space-y-2">
            {outgoing.map((r) => (
              <li
                key={r.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3"
              >
                <div>
                  <p className="font-display text-sm text-white">{r.displayName ?? r.uid}</p>
                  <p className="font-mono text-[10px] text-zinc-600">{r.uid}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cancelOutgoing(r.uid)}
                  className="btn-ghost py-1.5 font-mono text-xs"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="glass-panel space-y-3">
        <h2 className="font-display text-lg font-semibold text-white">Your friends</h2>
        {friends.length === 0 ? (
          <p className="font-mono text-sm text-zinc-500">No friends yet — send an invite above.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {friends.map((f) => (
              <li key={f.uid}>
                <Link
                  href={`/friends/${f.uid}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-4 transition hover:border-accent/30 hover:bg-surface/80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-white">
                      {f.displayName ?? "Player"}
                    </p>
                    <p className="truncate font-mono text-[10px] text-zinc-600">{f.uid}</p>
                    <p className="mt-1 font-mono text-[10px] text-zinc-500">
                      Steam {f.steamLinked ? "linked" : "not linked"}
                    </p>
                  </div>
                  <span className="text-xs text-accent">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
