"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { getAuthClient } from "@/lib/firebase";
import { authedFetch } from "@/lib/apiClient";
import { useSteamStore } from "@/lib/store";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/games", label: "Library" },
  { href: "/rare", label: "Rare" },
  { href: "/search", label: "Search" },
  { href: "/settings", label: "Settings" },
];

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 18L18 6M6 6l12 12" />
        </>
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </>
      )}
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const user = useSteamStore((s) => s.user);
  const profile = useSteamStore((s) => s.profile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [steamPersona, setSteamPersona] = useState<{
    avatarfull: string;
    personaname: string;
  } | null>(null);

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
        if (p && !cancelled)
          setSteamPersona({ avatarfull: p.avatarfull, personaname: p.personaname });
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.steamId, user]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!user || pathname === "/") return null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur-xl supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border p-2 text-zinc-200 transition hover:border-accent/40 hover:bg-white/5 md:hidden"
            >
              <BurgerIcon open={mobileOpen} />
            </button>
            <Link
              href="/dashboard"
              className="truncate font-display text-lg font-bold tracking-wide text-accent transition hover:text-accent/80 sm:text-xl"
            >
              AchievHQ
            </Link>
          </div>

          <nav
            aria-label="Main navigation"
            className="hidden flex-1 items-center justify-center gap-0.5 md:flex"
          >
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-lg px-3 py-1.5 font-display text-sm transition ${
                    active
                      ? "text-white after:absolute after:inset-x-3 after:bottom-0.5 after:h-px after:rounded-full after:bg-accent after:content-['']"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {steamPersona ? (
              <Image
                src={steamPersona.avatarfull}
                alt={steamPersona.personaname}
                width={32}
                height={32}
                className="rounded-full border border-accent/40"
              />
            ) : null}
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName ?? ""}
                width={32}
                height={32}
                className="rounded-full border border-white/10"
              />
            ) : null}
            <button
              type="button"
              onClick={() => signOut(getAuthClient())}
              className="btn-ghost hidden py-1.5 font-mono text-xs md:inline-flex"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer: backdrop + sliding panel */}
      <div
        className={`fixed inset-0 z-[100] md:hidden ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          title="Close menu"
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          id="mobile-nav-panel"
          className={`absolute inset-y-0 left-0 flex w-[min(19rem,88vw)] flex-col border-r border-white/10 bg-bg/95 shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform duration-300 ease-out supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)] supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)] ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <span className="font-display text-base font-bold text-accent">Menu</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <BurgerIcon open />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Mobile navigation">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-4 py-3 font-display text-base transition ${
                    active
                      ? "bg-accent/15 text-white ring-1 ring-accent/30"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                signOut(getAuthClient());
              }}
              className="btn-ghost w-full justify-center font-mono text-sm"
            >
              Sign out
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
