"use client";

import { useSteamStore } from "@/lib/store";

export function OfflineBanner() {
  const offline = useSteamStore((s) => s.offline);
  if (!offline) return null;
  return (
    <div className="flex animate-slide-down items-center justify-center gap-2 border-b border-gold/30 bg-gold/10 px-4 py-2 text-sm text-gold">
      {/* Feather wifi-off icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
        aria-hidden
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      Offline — showing cached data where available.
    </div>
  );
}
