export type LobbyPlayer = {
  uid: string;
  displayName: string;
  photoURL: string | null;
};

export type LobbyStatus = "open" | "full" | "done" | "cancelled";

export type AchievementLobby = {
  id: string;
  creatorUid: string;
  appId: number;
  gameName: string;
  apiname: string;
  achievementName: string;
  icon: string;
  rarityPct: number | null;
  requiredPlayers: number;
  players: LobbyPlayer[];
  playerUids: Record<string, boolean>;
  status: LobbyStatus;
  note: string;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LobbyMessage = {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  createdAt: string;
};
