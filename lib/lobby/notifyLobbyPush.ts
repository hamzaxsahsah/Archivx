import { isWebPushConfigured, sendWebPushToUser } from "@/lib/push/sendWebPush";
import type { AchievementLobby, LobbyPlayer } from "@/lib/lobby/lobbyTypes";

export async function notifyLobbyJoined(
  lobby: AchievementLobby,
  joiner: LobbyPlayer,
): Promise<void> {
  if (!isWebPushConfigured()) return;
  if (joiner.uid === lobby.creatorUid) return;
  await sendWebPushToUser(lobby.creatorUid, {
    title: `${joiner.displayName || "Someone"} joined your lobby`,
    body: `${lobby.achievementName}\n${lobby.gameName}`,
    url: `/lobby/${lobby.id}`,
    tag: `lobby-join-${lobby.id}-${joiner.uid}`,
  });
}

export async function notifyLobbyFull(
  lobby: AchievementLobby,
  joinerUid: string,
): Promise<void> {
  if (!isWebPushConfigured()) return;
  await Promise.allSettled(
    lobby.players
      .filter((p) => p.uid !== joinerUid)
      .map((p) =>
        sendWebPushToUser(p.uid, {
          title: "Lobby is full — time to play!",
          body: `${lobby.achievementName} · ${lobby.gameName}\nAll ${lobby.requiredPlayers} players are ready.`,
          url: `/lobby/${lobby.id}`,
          tag: `lobby-full-${lobby.id}`,
        }),
      ),
  );
}
