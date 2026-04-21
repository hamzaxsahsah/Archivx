/**
 * Verify Steam OpenID assertion (POST back to Steam).
 */
export async function verifySteamOpenIdAssertion(
  incomingQuery: URLSearchParams,
): Promise<boolean> {
  const body = new URLSearchParams();

  incomingQuery.forEach((value, key) => {
    if (key.startsWith("openid.")) {
      body.append(key, value);
    }
  });

  body.set("openid.mode", "check_authentication");
  body.set("openid.ns", "http://specs.openid.net/auth/2.0");

  const res = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  return text.includes("is_valid:true");
}
