const CACHE = "achievhq-v1";

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* ignore */
  }
  const title = typeof data.title === "string" ? data.title : "AchievHQ";
  const body = typeof data.body === "string" ? data.body : "";
  const url = typeof data.url === "string" ? data.url : "/";
  const tag = typeof data.tag === "string" ? data.tag : "achievhq";
  const icon = typeof data.icon === "string" && data.icon.startsWith("http") ? data.icon : undefined;
  const image = typeof data.image === "string" && data.image.startsWith("http") ? data.image : undefined;

  const options = {
    body,
    tag,
    data: { url },
    vibrate: [180, 90, 180],
    timestamp: Date.now(),
    renotify: true,
    requireInteraction: false,
    silent: false,
  };
  if (icon) options.icon = icon;
  if (image) options.image = image;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw =
    event.notification.data && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/";
  const path = raw.length > 0 ? raw : "/";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const targetUrl = path.startsWith("http")
    ? path
    : new URL(normalizedPath, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          if (new URL(client.url).pathname === new URL(normalizedPath, self.location.origin).pathname) {
            if ("focus" in client) {
              return client.focus();
            }
          }
        } catch {
          /* ignore */
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

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
