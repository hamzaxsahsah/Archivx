/**
 * Values from credentials/google-oauth-web.json / .env.local.
 * client_secret is server-only (never NEXT_PUBLIC_*).
 */
export const googleWebOAuth = {
  projectId: process.env.GOOGLE_OAUTH_PROJECT_ID ?? "",
  clientId:
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ??
    process.env.GOOGLE_OAUTH_CLIENT_ID ??
    "",
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
  authUri: process.env.GOOGLE_OAUTH_AUTH_URI ?? "",
  tokenUri: process.env.GOOGLE_OAUTH_TOKEN_URI ?? "",
  authProviderX509CertUrl:
    process.env.GOOGLE_OAUTH_AUTH_PROVIDER_X509_CERT_URL ?? "",
} as const;
