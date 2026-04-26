import type { DashboardBundle } from "@/lib/steam/dashboardStats";
import { findNewUnlocks } from "@/lib/steam/diffRecentUnlocks";
import { formatRarityPushLine } from "@/lib/steam/rarityTier";
import { isWebPushConfigured, sendWebPushToUser } from "@/lib/push/sendWebPush";
import { steamAchievementIconUrl, steamGameBannerUrls } from "@/lib/steam/steamImages";

/**
 * Compares dashboard bundles after Mongo sync and sends at most one summary push per sync.
 * Skips when there was no prior recent-unlock baseline (avoids noisy first fills).
 */
export async function notifyNewAchievementsIfAny(
  firebaseUid: string,
  previousBundle: DashboardBundle,
  newBundle: DashboardBundle,
): Promise<void> {
  if (!isWebPushConfigured()) return;
  if (!previousBundle.recentUnlocks.length) return;

  const newOnes = findNewUnlocks(previousBundle, newBundle);
  if (newOnes.length === 0) return;

  const newest = newOnes[0];
  const extra = newOnes.length - 1;

  const name = newest.displayName?.trim() || newest.apiname;
  const iconUrl = newest.icon?.trim()
    ? steamAchievementIconUrl(newest.appid, newest.icon)
    : "";
  const bannerUrl = steamGameBannerUrls(newest.appid)[0] ?? "";
  const imageUrl = bannerUrl || iconUrl;

  const rarityBlock = formatRarityPushLine(newest.rarityPct);
  const extraBlock =
    extra > 0
      ? `\n\n+${extra} more achievement${extra === 1 ? "" : "s"}`
      : "";

  const body = `${newest.gameName}\n\n${rarityBlock}${extraBlock}`;

  await sendWebPushToUser(firebaseUid, {
    title: name,
    body,
    url: `/games/${newest.appid}`,
    tag: `ach-${newest.appid}-${newest.apiname}-${newest.unlocktime}`,
    ...(iconUrl ? { icon: iconUrl } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
  });
}
