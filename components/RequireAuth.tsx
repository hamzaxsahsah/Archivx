"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSteamStore } from "@/lib/store";

function AuthSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="font-mono text-xs text-zinc-600">{label}</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const user = useSteamStore((s) => s.user);
  const authReady = useSteamStore((s) => s.authReady);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) router.replace("/");
  }, [authReady, user, router]);

  if (!mounted || !authReady) {
    return <AuthSpinner label="Checking session…" />;
  }

  if (!user) {
    return <AuthSpinner label="Redirecting…" />;
  }

  return <>{children}</>;
}
