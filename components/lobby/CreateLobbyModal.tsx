"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/apiClient";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { steamAchievementIconUrl } from "@/lib/steam/steamImages";

export type CreateLobbyData = {
  appId: number;
  gameName: string;
  apiname: string;
  achievementName: string;
  icon: string;
  rarityPct: number | null;
};

export function CreateLobbyModal({
  data,
  onClose,
}: {
  data: CreateLobbyData;
  onClose: () => void;
}) {
  const router = useRouter();
  const [requiredPlayers, setRequiredPlayers] = useState(2);
  const [note, setNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const iconSrc = data.icon ? steamAchievementIconUrl(data.appId, data.icon) : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.appId || !data.apiname) {
      setError("Achievement data is missing. Open this from an achievement guide panel.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authedFetch("/api/lobby", {
        method: "POST",
        body: JSON.stringify({
          appId: data.appId,
          gameName: data.gameName,
          apiname: data.apiname,
          achievementName: data.achievementName,
          icon: data.icon,
          rarityPct: data.rarityPct,
          requiredPlayers,
          note: note.trim(),
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const j = (await res.json()) as { lobbyId?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to create lobby");
      onClose();
      router.push(`/lobby/${j.lobbyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/60">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-4 font-display text-xl font-bold text-white">Create co-op lobby</h2>

        {data.appId && data.achievementName ? (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-black/20 p-3">
            {iconSrc ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                <Image src={iconSrc} alt="" fill className="object-cover" sizes="40px" />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-white">
                {data.achievementName}
              </p>
              <div className="flex items-center gap-2">
                <p className="truncate font-mono text-xs text-zinc-500">{data.gameName}</p>
                <RarityBadge percent={data.rarityPct} />
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Players needed
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRequiredPlayers(n)}
                  className={`rounded-lg border py-2 font-display text-sm transition ${
                    requiredPlayers === n
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-border text-zinc-400 hover:border-white/15 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {n} players
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Note <span className="normal-case">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="e.g. Need experienced players, prefer weekend evenings…"
              className="form-input w-full resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Scheduled time <span className="normal-case">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="form-input w-full"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting || !data.appId}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create lobby"}
          </button>
        </form>
      </div>
    </div>
  );
}
