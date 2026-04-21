const BASE = "https://api.steampowered.com";

export function requireSteamKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("STEAM_API_KEY is not configured");
  return key;
}

export async function steamGetOwnedGames(steamId: string) {
  const key = requireSteamKey();
  const url = new URL(`${BASE}/IPlayerService/GetOwnedGames/v1/`);
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("include_appinfo", "true");
  url.searchParams.set("include_played_free_games", "true");
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam GetOwnedGames failed: ${res.status}`);
  return res.json() as Promise<{
    response?: { games?: OwnedGameSteam[]; game_count?: number };
  }>;
}

export type OwnedGameSteam = {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
  img_logo_url?: string;
  rtime_last_played?: number;
};

export async function steamGetPlayerAchievements(
  steamId: string,
  appId: number,
) {
  const key = requireSteamKey();
  const url = new URL(`${BASE}/ISteamUserStats/GetPlayerAchievements/v1/`);
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("appid", String(appId));
  url.searchParams.set("l", "english");
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam GetPlayerAchievements failed: ${res.status}`);
  return res.json() as Promise<{
    playerstats?: {
      achievements?: {
        apiname: string;
        achieved: number;
        unlocktime?: number;
      }[];
      error?: string;
    };
  }>;
}

export async function steamGetGlobalAchievementPercentages(appId: number) {
  const url = new URL(
    `${BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/`,
  );
  url.searchParams.set("gameid", String(appId));
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Steam GetGlobalAchievementPercentages failed: ${res.status}`);
  }
  return res.json() as Promise<{
    achievementpercentages?: {
      achievements?: { name: string; percent: number }[];
    };
  }>;
}

export async function steamGetSchemaForGame(appId: number) {
  const key = requireSteamKey();
  const url = new URL(`${BASE}/ISteamUserStats/GetSchemaForGame/v2/`);
  url.searchParams.set("key", key);
  url.searchParams.set("appid", String(appId));
  url.searchParams.set("l", "english");
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam GetSchemaForGame failed: ${res.status}`);
  return res.json() as Promise<{
    game?: {
      gameName?: string;
      gameVersion?: string;
      availableGameStats?: {
        achievements?: {
          name: string;
          displayName: string;
          description: string;
          icon: string;
          icongray: string;
          hidden?: number;
        }[];
      };
    };
  }>;
}

export async function steamGetPlayerSummaries(steamIds: string) {
  const key = requireSteamKey();
  const url = new URL(`${BASE}/ISteamUser/GetPlayerSummaries/v2/`);
  url.searchParams.set("key", key);
  url.searchParams.set("steamids", steamIds);
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam GetPlayerSummaries failed: ${res.status}`);
  return res.json() as Promise<{
    response?: {
      players?: {
        steamid: string;
        personaname: string;
        avatarfull: string;
        avatarmedium: string;
      }[];
    };
  }>;
}
