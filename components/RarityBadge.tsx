type Props = {
  /** Steam / caches may send a string; we coerce for display. */
  percent: number | string | null | undefined;
};

function toPercentNumber(p: unknown): number | null {
  if (p == null || p === "") return null;
  const n = typeof p === "number" ? p : Number(p);
  return Number.isFinite(n) ? n : null;
}

function tier(p: number | null | undefined) {
  if (p == null || Number.isNaN(p)) {
    return {
      label: "?",
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

export function RarityBadge({ percent: percentRaw }: Props) {
  const percent = toPercentNumber(percentRaw);
  const t = tier(percent);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${t.className}`}
      title={percent != null ? `${percent.toFixed(1)}% global` : "Unknown rarity"}
    >
      <span aria-hidden>{t.icon}</span>
      {t.label}
      {percent != null ? (
        <span className="opacity-80">({percent.toFixed(1)}%)</span>
      ) : null}
    </span>
  );
}
