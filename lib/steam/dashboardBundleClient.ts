/**
 * Dedupes concurrent dashboard fetches (e.g. React Strict Mode double-mount) and
 * serves a short-lived memory hit when navigating Dashboard ↔ Library.
 */
import { authedFetch } from "@/lib/apiClient";
import type { DashboardBundle } from "@/lib/steam/dashboardStats";

const TTL_MS = 300_000;

export type DashboardFetchResult =
  | { ok: true; bundle: DashboardBundle }
  | { ok: false; notLinked: true }
  | { ok: false; error: string };

let mem: { key: string; fetchedAt: number; bundle: DashboardBundle } | null = null;
let inflight: Promise<DashboardFetchResult> | null = null;

/** Call after linking/unlinking Steam so the next view always refetches. */
export function invalidateDashboardBundleCache() {
  mem = null;
}

export async function loadDashboardBundle(
  identityKey: string,
  options: { bypass?: boolean } = {},
): Promise<DashboardFetchResult> {
  if (
    !options.bypass &&
    mem &&
    mem.key === identityKey &&
    Date.now() - mem.fetchedAt < TTL_MS
  ) {
    return { ok: true, bundle: mem.bundle };
  }
  if (inflight) return inflight;

  inflight = (async (): Promise<DashboardFetchResult> => {
    const res = await authedFetch("/api/steam/dashboard");
    const j = (await res.json()) as { error?: string } | DashboardBundle;
    if (!res.ok) {
      if (res.status === 400 && (j as { error?: string }).error === "STEAM_NOT_LINKED") {
        return { ok: false, notLinked: true };
      }
      return {
        ok: false,
        error: (j as { error?: string }).error ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true, bundle: j as DashboardBundle };
  })();

  try {
    const r = await inflight;
    if (r.ok) {
      mem = { key: identityKey, fetchedAt: Date.now(), bundle: r.bundle };
    }
    return r;
  } finally {
    inflight = null;
  }
}
