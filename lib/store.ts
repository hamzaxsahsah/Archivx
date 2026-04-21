import { create } from "zustand";
import type { User } from "firebase/auth";
import type { UserProfile } from "@/lib/firebase";

export type OwnedGame = {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
  img_logo_url?: string;
  rtime_last_played?: number;
};

export type AchievementRow = {
  apiname: string;
  achieved: number;
  unlocktime?: number;
};

export type SteamStoreState = {
  user: User | null;
  authReady: boolean;
  profile: UserProfile | null;
  offline: boolean;
  cacheStale: boolean;
  ownedGames: OwnedGame[];
  setUser: (u: User | null) => void;
  setAuthReady: (v: boolean) => void;
  setProfile: (p: UserProfile | null) => void;
  setOffline: (v: boolean) => void;
  setCacheStale: (v: boolean) => void;
  setOwnedGames: (g: OwnedGame[]) => void;
};

export const useSteamStore = create<SteamStoreState>((set) => ({
  user: null,
  authReady: false,
  profile: null,
  // Must match SSR (no `navigator`). Providers syncs real `offline` after mount.
  offline: false,
  cacheStale: false,
  ownedGames: [],
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setProfile: (profile) => set({ profile }),
  setOffline: (offline) => set({ offline }),
  setCacheStale: (cacheStale) => set({ cacheStale }),
  setOwnedGames: (ownedGames) => set({ ownedGames }),
}));
