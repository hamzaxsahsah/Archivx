import { unstable_cache } from "next/cache";
import { buildDashboardBundle } from "@/lib/steam/dashboardStats";

/** Aligned with non-Mongo dashboard route — dedupes concurrent builds across parallel API calls / Strict Mode. */
export const STEAM_DASHBOARD_CACHE_SECONDS = 90;

/**
 * Cached Steam dashboard bundle for a Steam64 id (same cache key Mongo + non-Mongo paths).
 */
export function getCachedSteamDashboardBundle(steamId: string) {
  return unstable_cache(
    buildDashboardBundle,
    ["steam-dashboard-bundle", steamId],
    {
      revalidate: STEAM_DASHBOARD_CACHE_SECONDS,
      tags: [`steam-dashboard-${steamId}`],
    },
  )(steamId);
}
