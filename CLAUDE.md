# ArchivIT — CLAUDE.md

Steam achievement tracking app. Users link their Steam account via OpenID, browse their game library and achievements, see rare unlocks, get push notifications for new achievements, and interact with friends.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.18 — App Router, `output: "standalone"` |
| Language | TypeScript 5.6.3 |
| Auth | Firebase Auth (Google OAuth) + Steam OpenID 2.0 |
| Primary DB | Firestore (source of truth) |
| Cache DB | MongoDB 7 (optional, accelerates multi-instance Docker) |
| Push | Web Push API + VAPID (`web-push` v3.6.7) |
| State | Zustand 5 (client), `unstable_cache` (server) |
| Styling | Tailwind CSS 3.4.15, custom components (no UI library) |
| Charts | Recharts 2.13.3 |
| Deployment | Docker + Compose (Node 20-alpine, non-root) |

---

## Project Structure

```
app/
  api/
    steam/          # Steam data endpoints (profile, dashboard, games, achievements, etc.)
    friends/        # Friend requests, messaging, overview
    push/           # Web push subscribe/unsubscribe
  dashboard/        # Main achievements overview page
  games/            # Game library page
  rare/             # Rare achievements list page
  search/           # Achievement search page
  friends/          # Friends list page
  settings/         # Account settings page
lib/
  authServer.ts         # requireUidFromRequest() — JWT verify
  firebase.ts           # Client Firebase init + Google sign-in
  firebaseAdmin.ts      # Admin SDK (Firestore, Auth getters)
  friendsAdmin.ts       # All friends/chat business logic (~1000 lines)
  dashboardCache.ts     # Mongo-backed dashboard cache helpers
  dashboardStats.ts     # buildDashboardBundle() — core data aggregation
  diffRecentUnlocks.ts  # Compare old vs new unlock snapshots
  maybeNotifyAchievements.ts  # Achievement push notification logic
  mongo.ts              # MongoDB connection singleton (maxPool: 10)
  mongoStore.ts         # Mongo cache read/write helpers
  notifyFriendRequestPush.ts  # Friend request push notification
  pushSubscriptionStore.ts    # Firestore push subscription CRUD
  rarityTier.ts               # Rarity label from % (Common/Uncommon/Rare/Epic/Legendary)
  sendWebPush.ts              # web-push wrapper with auto-cleanup on 404/410
  steamSync.ts                # scheduleBackgroundSteamSync() fire-and-forget
components/
  AchievementAlerts.tsx       # Toast notifications for new unlocks
  RarityBadge.tsx             # Rarity tier badge UI
  ServiceWorkerRegister.tsx   # Registers /public/sw.js in browser
public/
  sw.js                 # Service worker (push event handler)
scripts/
  migrate-firestore-to-mongo.ts  # One-time migration script
firestore.rules         # Security rules (user-scoped + admin-only collections)
docker-compose.yml      # mongo:7 + Next.js web service
Dockerfile              # Multi-stage: deps → builder → runner
```

---

## Authentication

1. Browser signs in with Google via Firebase popup → gets ID token.
2. All API calls include `Authorization: Bearer <idToken>`.
3. Server calls `requireUidFromRequest()` → `adminAuth().verifyIdToken(token)` → throws 401 if invalid.
4. **Steam linking** is a separate OpenID 2.0 flow:
   - `POST /api/steam/prepare-link` creates a 15-min state doc in Firestore.
   - Redirects to `steamcommunity.com/openid/login`.
   - `GET /api/steam/callback` verifies assertion, extracts Steam64 ID, writes to Firestore + MongoDB.

---

## Data Flow — Dashboard Bundle

This is the heaviest operation (80% of latency for new users).

```
GET /api/steam/dashboard
  → unstable_cache (90s TTL)
    → getCachedSteamDashboardBundle()
      → Mongo first (if available, check age < 10 min)
        → if stale: return Mongo data + scheduleBackgroundSteamSync() (fire-and-forget)
        → if missing: buildDashboardBundle() from Steam API
          → getOwnedGames()
          → parallel batches of 5: getGameSchema() + getPlayerAchievements() + getGlobalAchievements()
          → calculate completion %, rare count, recentUnlocks
      → save to Mongo + Firestore
```

Cold start for a new user with 500+ games can take 5–10 seconds.

---

## Caching Strategy

| Endpoint / Data | Next.js `unstable_cache` TTL | Mongo threshold |
|-----------------|------------------------------|----------------|
| Dashboard bundle | 90 sec | 10 min |
| Player profile | 45 sec | 10 min |
| Game schema | 24 h | N/A |
| Achievement rarity (global %) | 1 h | N/A |
| Player achievements (per game) | 2 min | N/A |
| Owned games list | 5 min | N/A |
| Achievement search | None (real-time) | N/A |

Background sync (`scheduleBackgroundSteamSync`) is fire-and-forget — it runs after the API response is sent. **Avoid `await`-ing it or moving it into a serverless path** — it will be truncated. It's safe in Docker/Node but not on Vercel/Netlify edge functions.

---

## API Routes Reference

### Steam
| Route | Method | Notes |
|-------|--------|-------|
| `/api/steam/prepare-link` | POST | Creates OpenID state + redirect URL |
| `/api/steam/callback` | GET | Verifies OpenID, saves steamId |
| `/api/steam/unlink` | POST | Purges all cached data + push subs |
| `/api/steam/profile` | GET | Player summary (name, avatar) |
| `/api/steam/dashboard` | GET | Full bundle (games, %, recent unlocks) |
| `/api/steam/games` | GET | Owned games list; triggers background sync |
| `/api/steam/achievements` | GET | `?appId=` player achievements; triggers background sync |
| `/api/steam/game/[appId]` | GET | Merged: schema + player ach + rarity + games list |
| `/api/steam/rare-list` | GET | All rare (<5%) achievements; triggers background sync |
| `/api/steam/rarity` | GET | `?appId=` global percentages |
| `/api/steam/schema` | GET | `?appId=` achievement names/icons |
| `/api/steam/achievement-search` | GET | `?q=` real-time search across all games |

### Friends
| Route | Method | Notes |
|-------|--------|-------|
| `/api/friends` | GET | Lists friends, incoming, outgoing |
| `/api/friends` | POST | Send request (`{ targetUid }`) |
| `/api/friends/respond` | POST | Accept/decline (`{ fromUid, accept }`) |
| `/api/friends/cancel` | POST | Cancel outgoing (`{ toUid }`) |
| `/api/friends/[friendUid]/overview` | GET | Friend's limited achievement summary |
| `/api/friends/[friendUid]/messages` | GET/POST | Chat history / send message |

### Push
| Route | Method | Notes |
|-------|--------|-------|
| `/api/push/subscribe` | POST | Register `PushSubscriptionJSON` |
| `/api/push/unsubscribe` | POST | Unregister by `endpoint` |

---

## Firestore Collections

| Collection | Access | Purpose |
|-----------|--------|---------|
| `users/{uid}` | User owns | Profile (email, displayName, steamId) |
| `users/{uid}/snapshots/{date}` | User owns | Daily activity snapshots |
| `users/{uid}/friends/{friendUid}` | User owns | Confirmed friends |
| `users/{uid}/requests/{fromUid}` | User owns | Incoming requests |
| `users/{uid}/requestsSent/{toUid}` | User owns | Outgoing requests |
| `steamLinkStates/{state}` | Admin only | 15-min OpenID tokens |
| `webPushSubscriptions/{endpoint_sha256}` | Admin only | Push subscriptions |
| `friendChats/{pairId}/messages/{id}` | Admin only | Chat (pairId = sorted uid1__uid2) |

---

## MongoDB Collections

| Collection | Key | Purpose |
|-----------|-----|---------|
| `users` | `firebaseUid` (unique) | Migrated profiles |
| `steam_dashboard_cache` | `firebaseUid` (unique) | Cached dashboard bundles |
| `steam_profile_cache` | `firebaseUid` (unique) | Cached player summaries |
| `activity_snapshots` | `(firebaseUid, date)` (unique) | Daily snapshots |

MongoDB is **optional** — if `MONGODB_URI` is unset, everything falls back to Firestore. Never assume Mongo is available; always code the Firestore fallback path.

---

## Push Notification System

- Service worker at `public/sw.js`, registered by `ServiceWorkerRegister` component (production only).
- VAPID keys: generate with `npx web-push generate-vapid-keys`.
- Subscriptions stored in Firestore `webPushSubscriptions/{sha256(endpoint)}`.
- Auto-cleanup: `sendWebPush.ts` deletes subscription doc on 404/410 from push service.
- Two notification types: **achievement unlock** (from `maybeNotifyAchievements`) and **friend request** (from `notifyFriendRequestPush`).

---

## Environment Variables

### Public (browser-exposed)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID   # optional
NEXT_PUBLIC_APP_URL                   # no trailing slash
NEXT_PUBLIC_VAPID_PUBLIC_KEY
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID    # optional
```

### Server-only
```
STEAM_API_KEY
FIREBASE_SERVICE_ACCOUNT_JSON         # full JSON, one line (preferred in Docker)
FIREBASE_SERVICE_ACCOUNT_PATH         # OR path to JSON file
VAPID_PRIVATE_KEY
VAPID_CONTACT                         # mailto: or https:, defaults to localhost
MONGODB_URI                           # optional; e.g. mongodb://mongo:27017/achievhq
MONGODB_DB                            # default: achievhq
```

---

## Known Performance Bottlenecks

1. **Cold dashboard for new users** — `buildDashboardBundle()` fetches N games × 3 Steam API calls in batches of 5. For 500-game libraries this takes 5–10s. Mitigated by the 90s `unstable_cache` + Mongo persistence.
2. **Achievement search** — uncached, real-time scan of entire library. Slow for large libraries (500+ games). A 5-min client-side localStorage cache would help.
3. **Background sync on serverless** — `scheduleBackgroundSteamSync()` is a fire-and-forget async void. It **will be truncated on Vercel/Netlify** because the HTTP response is sent before it finishes. Only reliable in Docker/Node.
4. **Friend overview** — makes three parallel Firestore/Mongo reads per request; acceptable but could be further reduced with a denormalized friend summary document.

---

## Development Commands

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Start standalone server
npm run lint       # ESLint

# Docker
docker compose up --build   # Start mongo + web
docker compose down         # Stop

# One-time migration
npx tsx --tsconfig tsconfig.json scripts/migrate-firestore-to-mongo.ts
```

---

## Conventions

- All API handlers call `requireUidFromRequest(req)` first — throws 401 if unauthenticated.
- MongoDB helpers (`mongoStore.ts`) always return `null` if Mongo is unavailable; callers fall back to Firestore.
- `unstable_cache` keys include the user's UID and relevant params — never use a shared global cache key.
- `friendPairId(uidA, uidB)` always sorts UIDs to ensure symmetric pair IDs.
- Push subscription doc IDs are `sha256(endpoint)` to avoid Firestore path-unsafe characters.
- Rarity tiers: ≤1% Legendary, ≤5% Epic, ≤15% Rare, ≤40% Uncommon, else Common (`lib/rarityTier.ts`).
- localStorage prefix for client cache: `achievhq:cache:`.
