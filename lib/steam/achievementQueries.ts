import type { OwnedGameSteam } from "@/lib/steamServer";
import {
  steamGetGlobalAchievementPercentages,
  steamGetOwnedGames,
  steamGetPlayerAchievements,
  steamGetSchemaForGame,
} from "@/lib/steamServer";
import type { RareAchievement } from "@/lib/steam/dashboardStats";

export type { RareAchievement };
/** Alias kept for page imports that reference RareRow */
export type RareRow = RareAchievement;

export type SearchRow = {
  appid: number;
  gameName: string;
  apiname: string;
  displayName: string;
  icon: string;
  rarityPct: number | null;
  unlocked: boolean;
};

const BATCH = 12;

async function getGames(steamId: string): Promise<OwnedGameSteam[]> {
  const owned = await steamGetOwnedGames(steamId);
  return owned.response?.games ?? [];
}

export async function searchAchievementNames(
  steamId: string,
  query: string,
): Promise<SearchRow[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const games = await getGames(steamId);
  const out: SearchRow[] = [];

  for (let i = 0; i < games.length; i += BATCH) {
    const chunk = games.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (g) => {
        if (g.playtime_forever === 0) return;
        try {
          const schemaJson = await steamGetSchemaForGame(g.appid);
          const list = schemaJson.game?.availableGameStats?.achievements ?? [];
          if (list.length === 0) return;

          const [playerJson, globalJson] = await Promise.all([
            steamGetPlayerAchievements(steamId, g.appid),
            steamGetGlobalAchievementPercentages(g.appid),
          ]);
          const byName = new Map(list.map((s) => [s.name, s]));
          const globalMap = new Map<string, number>();
          const ga = globalJson.achievementpercentages?.achievements;
          if (ga) {
            for (const x of ga) globalMap.set(x.name, x.percent);
          }
          const playerMap = new Map<string, { achieved: number }>();
          const pa = playerJson.playerstats?.achievements;
          if (pa) {
            for (const a of pa) {
              playerMap.set(a.apiname, { achieved: a.achieved });
            }
          }
          for (const sch of list) {
            const disp = (sch.displayName || sch.name).toLowerCase();
            if (!disp.includes(q) && !sch.name.toLowerCase().includes(q)) continue;
            const p = playerMap.get(sch.name);
            const unlocked = p?.achieved === 1;
            out.push({
              appid: g.appid,
              gameName: g.name,
              apiname: sch.name,
              displayName: sch.displayName || sch.name,
              icon: sch.icon,
              rarityPct: globalMap.get(sch.name) ?? null,
              unlocked,
            });
          }
        } catch {
          /* skip */
        }
      }),
    );
  }

  out.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return out;
}
