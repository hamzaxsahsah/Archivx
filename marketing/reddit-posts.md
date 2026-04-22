# AchievHQ — Reddit Launch Posts

---

## POST 1 — r/Steamachievements
**Best subreddit — most targeted audience**  
https://www.reddit.com/r/Steamachievements/

---

**Title:**
> I built a free Steam achievement tracker that shows rarity, ranks you, and surfaces your rarest unlocks — looking for v0 testers

**Body:**

Hey everyone,

Fellow achievement hunter here. I got frustrated that Steam's achievement UI is scattered and gives you basically no useful stats, so I built something.

AchievHQ — a free PWA that connects to your Steam account and gives you:

📊 A dashboard showing all your achievements across your whole library (total unlocked, completion %, rare count)

🏆 Rare showcase — achievements you've earned that less than 5% of players have. Finally a place to flex those grinds

💍 Completion rings — see at a glance which games you're 80%, 90%, one achievement away from 100%

🎖️ Rank system — ROOKIE → SOLDIER → HUNTER → ELITE → LEGEND → COMPLETIONIST based on your overall completion %

🔍 Achievement search across your entire library (try finding a specific achievement in vanilla Steam… it's painful)

📈 Unlock trend chart over time

It's completely free, no account needed beyond linking Steam via OpenID (read-only, I never see your credentials).

I'm looking for ~50 v0 testers to hammer it and tell me what's missing before I build v1. If you're into achievement hunting, you're exactly who I built this for.

Link: https://achievhq.netlify.app

If you have 4 minutes, I also made a quick feedback form: [https://docs.google.com/forms/d/e/1FAIpQLScBmdKLs1kaep0GZbxw5Gd_XZO3DfhUXR20C2l6yD4crm4jZg/viewform?usp=publish-editor]

What features would make this a daily driver for you? Genuinely asking — I want to build what the community actually needs.

Mods: happy to remove if this breaks rules — I think it's on-topic since it's directly about Steam achievements. Let me know.

Sorry, this post was removed by Reddit’s filters.

## POST 2 — r/Steam
**Larger audience, less targeted**  
https://www.reddit.com/r/Steam/

---

**Title:**
> Built a free Steam achievement dashboard because Steam's built-in one is kind of terrible — rarity stats, ranks, completion tracker

**Body:**

Not gonna lie, Steam's achievement UI has barely changed in 10 years. You get a list of icons and a completion %. That's it.

So I built **AchievHQ** — a free web app that connects to your Steam account and actually makes your achievements feel meaningful.

**What it does:**

→ Shows a proper dashboard: total achievements across all your games, your overall completion %, how many rare unlocks you have (under 5% global rate)

→ **Rare achievement showcase** — if you've grinded something only 0.4% of players have, it finally gets a spotlight

→ Per-game completion rings + ranks (ROOKIE to COMPLETIONIST)

→ Search your entire achievement history in one place

→ Unlock trend chart — see your velocity over weeks/months

**It's free, works on mobile (PWA), and only needs read-only Steam access.**

I'm in v0 and actively looking for feedback. What would make this actually useful to you day-to-day?

Try it: **[achievhq.netlify.app]**
Feedback form (4 min): **[https://docs.google.com/forms/d/e/1FAIpQLScBmdKLs1kaep0GZbxw5Gd_XZO3DfhUXR20C2l6yD4crm4jZg/viewform?usp=publish-editor]**

---

## POST 3 — r/pcgaming
**Broader gaming audience**  
https://www.reddit.com/r/pcgaming/

---

**Title:**
> I made a free achievement tracker for Steam because I wanted to actually see my stats — rarity, completion rank, rare unlocks dashboard

**Body:**

If you're the kind of person who actually cares about achievements (guilty), Steam makes it surprisingly hard to see your own stats in any meaningful way.

I built **AchievHQ** to scratch my own itch. It's a free web app / PWA that:

- Pulls your entire Steam library and shows real stats: total achievements, completion %, rare unlocks
- Highlights your **rarest achievements** (under 5% global unlock rate) — the stuff worth showing off
- Gives you a rank based on your overall completion (from ROOKIE up to COMPLETIONIST)
- Lets you search achievements across all your games at once
- Shows your unlock trend over time

Works on desktop and mobile, no install needed, free, read-only Steam access.

I'm at v0 and want real feedback from people who actually care about this stuff. What features would make you use it regularly?

**[achievhq.netlify.app]** — try it out

Quick feedback form if you want to shape v1: **[https://docs.google.com/forms/d/e/1FAIpQLScBmdKLs1kaep0GZbxw5Gd_XZO3DfhUXR20C2l6yD4crm4jZg/viewform?usp=publish-editor]**

---

## POST 4 — r/SideProject
**Developer/builder community — for visibility and credibility**  
https://www.reddit.com/r/SideProject/

---

**Title:**
> AchievHQ — Steam achievement tracker PWA I built in Next.js 14. Looking for early testers and feedback

**Body:**

Hey r/SideProject,

Sharing my latest: **AchievHQ**, a Steam achievement tracker web app.

**The problem:** Steam's achievement UI is 10 years old and shows you almost nothing useful. No rarity stats, no cross-game search, no progress overview, no way to see your rarest unlocks.

**What I built:**

- Next.js 14 App Router + TypeScript + Tailwind CSS
- Firebase Auth (Google sign-in) + Firestore for user profiles
- Steam Web API proxy (server-side, key never hits the client)
- PWA with offline support via service worker
- Server-side caching with `unstable_cache` (24h schema, 1h rarity, 2min player data)
- Merged API endpoints — one auth check instead of 4 for the game detail page

**Features:**
- Achievement dashboard across your entire library
- Rare achievement showcase (<5% global unlock rate)
- Per-game completion rings + dynamic rank (ROOKIE → COMPLETIONIST)
- Achievement search across all games
- Unlock trend chart (Recharts)

**Stack:** Next.js 14 / React 18 / TypeScript / Tailwind / Firebase / Vercel (Netlify now)

It's live at **[achievhq.netlify.app]** — free, no paywall, just link your Steam.

I'm at v0 and actively collecting feedback to build v1. Would love to hear what the builder community thinks, especially on the tech side or the product direction.

Feedback form: **[https://docs.google.com/forms/d/e/1FAIpQLScBmdKLs1kaep0GZbxw5Gd_XZO3DfhUXR20C2l6yD4crm4jZg/viewform?usp=publish-editor]**

What would you build next if this were your project?

---

## Posting Tips

**Best times to post (UTC):**
- Weekdays: 14:00–17:00 UTC (catches US morning + EU afternoon)
- Weekend: 10:00–13:00 UTC (peak Reddit browsing)

**Do NOT post all 4 on the same day** — stagger by 2–3 days to avoid looking like spam.

**Suggested order:**
1. r/Steamachievements (Day 1) — most targeted
2. r/SideProject (Day 2) — builder audience, good for credibility
3. r/Steam (Day 4) — largest audience, ride any momentum
4. r/pcgaming (Day 7) — if traction from above

**Before posting:** Replace `[achievhq.netlify.app]` and `[https://docs.google.com/forms/d/e/1FAIpQLScBmdKLs1kaep0GZbxw5Gd_XZO3DfhUXR20C2l6yD4crm4jZg/viewform?usp=publish-editor]` with real URLs.

**Engage in comments** — reply to every comment in the first 2 hours. Reddit's algorithm rewards early engagement velocity.
