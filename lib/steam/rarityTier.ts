/** Shared rarity tiers (Steam global %) — matches UI badges and push copy. */

export function toPercentNumber(p: unknown): number | null {
  if (p == null || p === "") return null;
  const n = typeof p === "number" ? p : Number(p);
  return Number.isFinite(n) ? n : null;
}

export type RarityTierInfo = {
  label: string;
  className: string;
  icon: string;
};

export function getRarityTierInfo(percent: number | null | undefined): RarityTierInfo {
  const p = toPercentNumber(percent);
  if (p == null || Number.isNaN(p)) {
    return {
      label: "Unknown",
      className: "border border-border bg-surface text-zinc-400",
      icon: "·",
    };
  }
  if (p < 5) {
    return {
      label: "Legendary",
      className: "border border-gold/60 bg-gold/15 text-gold shadow-glow-gold",
      icon: "✦",
    };
  }
  if (p < 15) {
    return {
      label: "Rare",
      className: "border border-slate-300/50 bg-slate-500/15 text-slate-200",
      icon: "◆",
    };
  }
  if (p < 30) {
    return {
      label: "Uncommon",
      className: "border border-amber-700/50 bg-amber-900/30 text-amber-200",
      icon: "◇",
    };
  }
  return {
    label: "Common",
    className: "border border-zinc-600 bg-zinc-800/80 text-zinc-400",
    icon: "○",
  };
}

/** Short line for notifications (mirrors badge semantics). */
export function formatRarityPushLine(percent: number | null | undefined): string {
  const p = toPercentNumber(percent);
  const t = getRarityTierInfo(p);
  if (p != null) {
    return `${t.icon} ${t.label} · ${p.toFixed(1)}% of players`;
  }
  return `${t.icon} ${t.label} · global % unavailable`;
}
