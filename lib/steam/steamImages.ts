/**
 * Steam CDN helpers.
 * APIs may return either a **filename hash** (e.g. `fc668946cb4ab717...`) or a **full HTTPS URL**
 * (often `steamcdn-a.akamaihd.net`); we must not concatenate the latter onto media.steampowered.com.
 */

/**
 * Resolve `icon` / `img_icon_url` / `icongray` from Steam Web API to a single image URL.
 */
export function resolveSteamAppImageUrl(appId: number, iconRef: string): string {
  const raw = iconRef.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  const filename = /\.(jpe?g|png|webp)$/i.test(raw) ? raw : `${raw}.jpg`;
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${filename}`;
}

/** Portrait library art (~600×900), best for cards. May 404 for very old titles. */
export function steamLibraryCapsuleUrl(appId: number) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
}

/** Small store/community icon from GetOwnedGames `img_icon_url`. */
export function steamCommunityIconUrl(appId: number, imgIconHash: string) {
  const url = resolveSteamAppImageUrl(appId, imgIconHash);
  return url || null;
}

/** Achievement icon from GetSchemaForGame `icon` / `icongray`. */
export function steamAchievementIconUrl(appId: number, iconFile: string) {
  return resolveSteamAppImageUrl(appId, iconFile);
}

/** Wide banners for game detail (try in order; higher-res first). */
export function steamGameBannerUrls(appId: number): readonly string[] {
  return [
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
    `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`,
  ];
}
