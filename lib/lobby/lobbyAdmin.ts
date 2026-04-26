import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import type {
  AchievementLobby,
  LobbyMessage,
  LobbyPlayer,
  LobbyStatus,
} from "@/lib/lobby/lobbyTypes";

export type { AchievementLobby, LobbyMessage, LobbyPlayer, LobbyStatus };

const COL = "achievementLobbies";

function toIso(ts: FirebaseFirestore.Timestamp | null | undefined): string | null {
  return ts?.toDate().toISOString() ?? null;
}

function docToLobby(id: string, d: FirebaseFirestore.DocumentData): AchievementLobby {
  return {
    id,
    creatorUid: d.creatorUid,
    appId: d.appId,
    gameName: d.gameName,
    apiname: d.apiname,
    achievementName: d.achievementName,
    icon: d.icon ?? "",
    rarityPct: d.rarityPct ?? null,
    requiredPlayers: d.requiredPlayers,
    players: d.players ?? [],
    playerUids: d.playerUids ?? {},
    status: d.status,
    note: d.note ?? "",
    scheduledAt: toIso(d.scheduledAt),
    createdAt: toIso(d.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(d.updatedAt) ?? new Date().toISOString(),
  };
}

export async function createLobby(params: {
  uid: string;
  displayName: string;
  photoURL: string | null;
  appId: number;
  gameName: string;
  apiname: string;
  achievementName: string;
  icon: string;
  rarityPct: number | null;
  requiredPlayers: number;
  note: string;
  scheduledAt: string | null;
}): Promise<string> {
  const { uid, displayName, photoURL, scheduledAt, ...rest } = params;
  const player: LobbyPlayer = { uid, displayName, photoURL };
  const now = Timestamp.now();
  const ref = adminDb().collection(COL).doc();
  await ref.set({
    ...rest,
    creatorUid: uid,
    players: [player],
    playerUids: { [uid]: true },
    status: "open" as LobbyStatus,
    scheduledAt: scheduledAt ? Timestamp.fromDate(new Date(scheduledAt)) : null,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getLobby(lobbyId: string): Promise<AchievementLobby | null> {
  const snap = await adminDb().collection(COL).doc(lobbyId).get();
  if (!snap.exists) return null;
  return docToLobby(snap.id, snap.data()!);
}

export async function listLobbies(opts: {
  appId?: number;
  status?: LobbyStatus;
  limit?: number;
}): Promise<AchievementLobby[]> {
  const statuses: LobbyStatus[] = opts.status ? [opts.status] : ["open", "full"];
  const snap = await adminDb()
    .collection(COL)
    .where("status", "in", statuses)
    .limit(120)
    .get();
  let lobbies = snap.docs.map((d) => docToLobby(d.id, d.data()));
  if (opts.appId) lobbies = lobbies.filter((l) => l.appId === opts.appId);
  lobbies.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return lobbies.slice(0, opts.limit ?? 60);
}

export async function joinLobby(
  lobbyId: string,
  uid: string,
  displayName: string,
  photoURL: string | null,
): Promise<{ alreadyIn: boolean; nowFull: boolean }> {
  const ref = adminDb().collection(COL).doc(lobbyId);
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Lobby not found");
    const d = snap.data()!;
    if (d.status === "done" || d.status === "cancelled") throw new Error("Lobby is closed");
    if ((d.playerUids ?? {})[uid]) return { alreadyIn: true, nowFull: false };
    if ((d.players ?? []).length >= d.requiredPlayers) throw new Error("Lobby is full");
    const newPlayers: LobbyPlayer[] = [...(d.players ?? []), { uid, displayName, photoURL }];
    const nowFull = newPlayers.length >= d.requiredPlayers;
    tx.update(ref, {
      players: newPlayers,
      playerUids: { ...(d.playerUids ?? {}), [uid]: true },
      status: nowFull ? "full" : "open",
      updatedAt: Timestamp.now(),
    });
    return { alreadyIn: false, nowFull };
  });
}

export async function leaveLobby(lobbyId: string, uid: string): Promise<void> {
  const ref = adminDb().collection(COL).doc(lobbyId);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Lobby not found");
    const d = snap.data()!;
    if (d.creatorUid === uid) throw new Error("Creator must cancel instead of leaving");
    if (!(d.playerUids ?? {})[uid]) throw new Error("Not in lobby");
    const newPlayers = (d.players as LobbyPlayer[]).filter((p) => p.uid !== uid);
    const newUids = { ...(d.playerUids ?? {}) };
    delete newUids[uid];
    tx.update(ref, {
      players: newPlayers,
      playerUids: newUids,
      status: "open" as LobbyStatus,
      updatedAt: Timestamp.now(),
    });
  });
}

export async function setLobbyStatus(
  lobbyId: string,
  uid: string,
  status: "done" | "cancelled",
): Promise<void> {
  const ref = adminDb().collection(COL).doc(lobbyId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Lobby not found");
  if (snap.data()!.creatorUid !== uid) throw new Error("Only the creator can do this");
  await ref.update({ status, updatedAt: Timestamp.now() });
}

export async function getLobbyMessages(lobbyId: string): Promise<LobbyMessage[]> {
  const snap = await adminDb()
    .collection(COL)
    .doc(lobbyId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      authorUid: x.authorUid,
      authorName: x.authorName,
      authorPhoto: x.authorPhoto ?? null,
      text: x.text,
      createdAt: toIso(x.createdAt) ?? new Date().toISOString(),
    };
  });
}

export async function sendLobbyMessage(
  lobbyId: string,
  uid: string,
  displayName: string,
  photoURL: string | null,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 1000) throw new Error("Invalid message");
  const lobby = await getLobby(lobbyId);
  if (!lobby) throw new Error("Lobby not found");
  if (!lobby.playerUids[uid]) throw new Error("Not a member of this lobby");
  await adminDb()
    .collection(COL)
    .doc(lobbyId)
    .collection("messages")
    .add({
      authorUid: uid,
      authorName: displayName,
      authorPhoto: photoURL,
      text: trimmed,
      createdAt: Timestamp.now(),
    });
}
