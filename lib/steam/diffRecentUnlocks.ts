import type { DashboardBundle, RecentUnlock } from "@/lib/steam/dashboardStats";

function unlockKey(u: RecentUnlock): string {
  return `${u.appid}:${u.apiname}:${u.unlocktime}`;
}

/** Unlocks present in `newBundle` but not in `oldBundle` (by appid + api name + time), newest first. */
export function findNewUnlocks(
  oldBundle: DashboardBundle,
  newBundle: DashboardBundle,
): RecentUnlock[] {
  const oldKeys = new Set(oldBundle.recentUnlocks.map(unlockKey));
  const candidates = newBundle.recentUnlocks.filter((u) => !oldKeys.has(unlockKey(u)));
  candidates.sort((a, b) => b.unlocktime - a.unlocktime);
  return candidates;
}
