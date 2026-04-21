import { getAuthClient } from "@/lib/firebase";

export async function authedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const auth = getAuthClient();
  const u = auth.currentUser;
  if (!u) {
    throw new Error("Not signed in");
  }
  const token = await u.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
