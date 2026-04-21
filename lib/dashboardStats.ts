import type { OwnedGameSteam } from "@/lib/steamServer";
import {
  steamGetGlobalAchievementPercentages,
  steamGetOwnedGames,
  steamGetPlayerAchievements,
  steamGetSchemaForGame,
} from "@/lib/steamServer";

export type RecentUnlock = {
  appid: number;
  gameName: string;
  apiname: string;
  displayName: string;
  unlocktime: number;
  icon: string;
  rarityPct: number | null;
};

export type MostPlayedRow = {
  appid: number;
  name: string;
  playtimeHours: number;
  unlocked: number;
  total: number;
  completionPct: number;
  rtime_last_played: number;
};

export type PerGameProgress = {
  appid: number;
  name: string;
  playtime_forever: number;
  rtime_last_played: number;
  img_icon_url?: string;
  img_logo_url?: string;
  unlocked: number;
  total: number;
  completionPct: number;
};

export type DashboardBundle = {
  gamesOwned: number;
  totalUnlocked: number;
  totalAvailable: number;
  completionPct: number;
  rareUnlocked: number;
  recentUnlocks: RecentUnlock[];
  mostPlayed: MostPlayedRow[];
  perGame: PerGameProgress[];
  privateProfile: boolean;
};

const BATCH = 5;

type OneGame = {
  progress: PerGameProgress;
  recent: RecentUnlock[];
  rareAdded: number;
};

async function processGame(steamId: string, g: OwnedGameSteam): Promise<OneGame> {
  const appid = g.appid;
  const emptyProgress: PerGameProgress = {
    appid,
    name: g.name,
    playtime_forever: g.playtime_forever,
    rtime_last_played: g.rtime_last_played ?? 0,
    img_icon_url: g.img_icon_url,
    img_logo_url: g.img_logo_url,
    unlocked: 0,
    total: 0,
    completionPct: 0,
  };

  try {
    const [schemaJson, playerJson, globalJson] = await Promise.all([
      steamGetSchemaForGame(appid),
      steamGetPlayerAchievements(steamId, appid),
      steamGetGlobalAchievementPercentages(appid),
    ]);

    const list = schemaJson.game?.availableGameStats?.achievements ?? [];
    const globalMap = new Map<string, number>();
    const ga = globalJson.achievementpercentages?.achievements;
    if (ga) {
      for (const x of ga) globalMap.set(x.name, x.percent);
    }

    const byName = new Map(list.map((s) => [s.name, s]));

    const playerMap = new Map<
      string,
      { achieved: number; unlocktime: number }
    >();
    const pa = playerJson.playerstats?.achievements;
    if (pa) {
      for (const a of pa) {
        playerMap.set(a.apiname, {
          achieved: a.achieved,
          unlocktime: a.unlocktime ?? 0,
        });
      }
    }

    let unlocked = 0;
    const recent: RecentUnlock[] = [];
    let rareAdded = 0;

    if (list.length) {
      for (const s of list) {
        const p = playerMap.get(s.name);
        if (p?.achieved === 1) unlocked++;
      }
    }

    if (pa && list.length) {
      for (const a of pa) {
        if (a.achieved !== 1) continue;
        const sch = byName.get(a.apiname);
        const disp = sch?.displayName ?? a.apiname;
        const pct = globalMap.get(a.apiname);
        if (pct != null && pct < 5) rareAdded++;
        if (a.unlocktime) {
          recent.push({
            appid,
            gameName: g.name,
            apiname: a.apiname,
            displayName: disp,
            unlocktime: a.unlocktime,
            icon: sch?.icon ?? "",
            rarityPct: pct ?? null,
          });
        }
      }
    }

    const total = list.length;
    const completionPct = total
      ? Math.round((unlocked / total) * 1000) / 10
      : 0;

    return {
      progress: {
        ...emptyProgress,
        unlocked,
        total,
        completionPct,
      },
      recent,
      rareAdded,
    };
  } catch {
    return { progress: emptyProgress, recent: [], rareAdded: 0 };
  }
}

export async function buildDashboardBundle(steamId: string): Promise<DashboardBundle> {
  const owned = await steamGetOwnedGames(steamId);
  const games = owned.response?.games ?? [];
  if (!games.length) {
    return {
      gamesOwned: 0,
      totalUnlocked: 0,
      totalAvailable: 0,
      completionPct: 0,
      rareUnlocked: 0,
      recentUnlocks: [],
      mostPlayed: [],
      perGame: [],
      privateProfile: true,
    };
  }

  const perGame: PerGameProgress[] = [];
  const allRecent: RecentUnlock[] = [];
  let rareUnlocked = 0;

  for (let i = 0; i < games.length; i += BATCH) {
    const chunk = games.slice(i, i + BATCH);
    const results = await Promise.all(chunk.map((g) => processGame(steamId, g)));
    for (const r of results) {
      perGame.push(r.progress);
      allRecent.push(...r.recent);
      rareUnlocked += r.rareAdded;
    }
  }

  let totalUnlocked = 0;
  let totalAvailable = 0;
  for (const p of perGame) {
    totalUnlocked += p.unlocked;
    totalAvailable += p.total;
  }
  const completionPct = totalAvailable
    ? Math.round((totalUnlocked / totalAvailable) * 1000) / 10
    : 0;

  allRecent.sort((a, b) => b.unlocktime - a.unlocktime);

  const mostPlayed = [...perGame]
    .filter((p) => p.total > 0)
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 8)
    .map((p) => ({
      appid: p.appid,
      name: p.name,
      playtimeHours: Math.round((p.playtime_forever / 60) * 10) / 10,
      unlocked: p.unlocked,
      total: p.total,
      completionPct: p.completionPct,
      rtime_last_played: p.rtime_last_played,
    }));

  return {
    gamesOwned: games.length,
    totalUnlocked,
    totalAvailable,
    completionPct,
    rareUnlocked,
    recentUnlocks: allRecent.slice(0, 20),
    mostPlayed,
    perGame,
    privateProfile: false,
  };
}
