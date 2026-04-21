"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthButton } from "@/components/AuthButton";
import { useSteamStore } from "@/lib/store";

export default function LandingPage() {
  const router = useRouter();
  const authReady = useSteamStore((s) => s.authReady);
  const user = useSteamStore((s) => s.user);

  useEffect(() => {
    if (authReady && user) router.replace("/dashboard");
  }, [authReady, user, router]);

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center gap-10 text-center">
      {/* Decorative grid overlay */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />

      <div className="relative space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-accent">
          Steam achievement command center
        </p>
        <h1 className="bg-gradient-to-r from-accent via-sky-300 to-gold bg-clip-text font-display text-6xl font-bold text-transparent md:text-7xl">
          AchievHQ
        </h1>
        <p className="mx-auto max-w-lg text-balance text-zinc-400">
          Link Google, attach your Steam profile, and explore completion, rarity, and history across
          your library — all in a fast, installable PWA.
        </p>
      </div>

      <AuthButton />

      <p className="max-w-md font-mono text-xs text-zinc-600">
        Steam Web API calls are proxied on the server. OpenID is only used to read your public
        Steam64 ID.
      </p>
      <Link
        href="/dashboard"
        className="font-mono text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
      >
        Already signed in? Continue to dashboard →
      </Link>
    </div>
  );
}
