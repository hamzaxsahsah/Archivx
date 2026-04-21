"use client";

import { Suspense, useEffect, useState } from "react";
import { authedFetch } from "@/lib/apiClient";
import { invalidateDashboardBundleCache } from "@/lib/dashboardBundleClient";
import { SteamLinkButton } from "@/components/SteamLinkButton";
import { RequireAuth } from "@/components/RequireAuth";
import { useSteamStore } from "@/lib/store";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <p className="font-mono text-sm text-zinc-500">Loading settings…</p>
        }
      >
        <SettingsInner />
      </Suspense>
    </RequireAuth>
  );
}

function SettingsInner() {
  const profile = useSteamStore((s) => s.profile);
  const user = useSteamStore((s) => s.user);
  const searchParams = useSearchParams();
  const steamStatus = searchParams.get("steam");
  const [steamPersona, setSteamPersona] = useState<{
    avatarfull: string;
    personaname: string;
  } | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    if (!profile?.steamId || !user) {
      setSteamPersona(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/steam/profile");
        if (!res.ok) return;
        const j = (await res.json()) as {
          response?: { players?: { avatarfull: string; personaname: string }[] };
        };
        const p = j.response?.players?.[0];
        if (p && !cancelled) setSteamPersona(p);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.steamId, user]);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header className="page-header">
        <h1 className="font-display text-3xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500">Google identity and Steam linkage.</p>
      </header>

      {steamStatus === "linked" ? (
        <div className="animate-slide-down rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Steam account linked successfully.
        </div>
      ) : null}
      {steamStatus && steamStatus !== "linked" ? (
        <div className="animate-slide-down rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Steam linking did not complete ({steamStatus}). Try again from the button below.
        </div>
      ) : null}

      <section className="glass-panel space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Google account</h2>
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <Image src={user.photoURL} alt="" width={56} height={56} className="rounded-full border border-white/10" />
          ) : null}
          <div>
            <p className="font-display text-base text-white">{user?.displayName}</p>
            <p className="font-mono text-sm text-zinc-500">{user?.email}</p>
          </div>
        </div>
      </section>

      <section className="glass-panel space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Steam</h2>
        {profile?.steamId && steamPersona ? (
          <div className="flex flex-wrap items-center gap-4">
            <Image
              src={steamPersona.avatarfull}
              alt=""
              width={48}
              height={48}
              className="shrink-0 rounded-full border border-accent/40"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base text-white">{steamPersona.personaname}</p>
              <p className="font-mono text-xs text-zinc-500">Steam ID {profile.steamId}</p>
            </div>
            <button
              type="button"
              disabled={unlinking}
              onClick={async () => {
                setUnlinking(true);
                try {
                  await authedFetch("/api/steam/unlink", { method: "POST" });
                  invalidateDashboardBundleCache();
                  window.location.reload();
                } finally {
                  setUnlinking(false);
                }
              }}
              className="btn-danger shrink-0 text-xs"
            >
              {unlinking ? "…" : "Unlink"}
            </button>
          </div>
        ) : (
          <SteamLinkButton />
        )}
        <p className="font-mono text-xs leading-relaxed text-zinc-500">
          We use Steam OpenID only to read your Steam64 ID once. Game and achievement data comes from
          Valve&apos;s public Web API via a server proxy.
        </p>
      </section>
    </div>
  );
}
