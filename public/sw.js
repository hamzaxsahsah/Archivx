const CACHE = "achievhq-v1";
const STEAM_HOSTS = [
  "steamcdn-a.akamaihd.net",
  "cdn.akamai.steamstatic.com",
  "media.steampowered.com",
  "avatars.steamstatic.com",
  "avatars.akamai.steamstatic.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/offline.html", "/manifest.json"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function isSteamImage(url) {
  try {
    const u = new URL(url);
    return STEAM_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = request.url;
  if (isSteamImage(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return (
            (await cache.match("/offline.html")) ||
            Response.error()
          );
        }
      }),
    );
    return;
  }

  if (url.includes("/_next/static/") || url.endsWith("/manifest.json")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
  }
});
