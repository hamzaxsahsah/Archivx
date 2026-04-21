/**
 * Steam OpenID 2.0 — build the redirect URL only. Return/callback is handled in /api/steam/callback.
 */
export function buildSteamOpenIdLoginUrl(returnTo: string, realm: string): string {
  const p = new URLSearchParams();
  p.set("openid.ns", "http://specs.openid.net/auth/2.0");
  p.set("openid.mode", "checkid_setup");
  p.set("openid.return_to", returnTo);
  p.set("openid.realm", realm);
  p.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
  p.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
  return `https://steamcommunity.com/openid/login?${p.toString()}`;
}

export function extractSteam64FromClaimedId(claimedId: string | null): string | null {
  if (!claimedId) return null;
  const m = claimedId.match(/\/openid\/id\/(\d+)/);
  return m?.[1] ?? null;
}
