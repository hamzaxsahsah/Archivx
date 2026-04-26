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
    let res: Response;
    try {
      res = await authedFetch("/api/steam/dashboard");
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error" };
    }

    // Netlify / proxies may return an HTML error page on 502/504 — guard JSON parse
    let j: { error?: string } | DashboardBundle;
    try {
      j = (await res.json()) as { error?: string } | DashboardBundle;
    } catch {
      return {
        ok: false,
        error: res.status === 502 || res.status === 504
          ? `Gateway timeout (${res.status}) — first load for large libraries can exceed Netlify's function limit. Try refreshing.`
          : `Server returned HTTP ${res.status} with non-JSON body.`,
      };
    }

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
