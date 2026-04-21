"use client";

import { useState } from "react";
import { authedFetch } from "@/lib/apiClient";

export function SteamLinkButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await authedFetch("/api/steam/prepare-link", {
              method: "POST",
            });
            const data = (await res.json()) as { authUrl?: string; error?: string };
            if (!res.ok || !data.authUrl) {
              setErr(data.error ?? "Could not start Steam link. Is Firebase Admin configured?");
              return;
            }
            window.location.href = data.authUrl;
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Failed to link Steam");
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-lg border border-accent/40 bg-[#171a21] px-4 py-2.5 text-sm font-display font-semibold text-accent shadow-glow-accent transition hover:bg-[#1b2838]"
      >
        {busy ? "Redirecting to Steam…" : "Link Steam account"}
      </button>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
    </div>
  );
}
