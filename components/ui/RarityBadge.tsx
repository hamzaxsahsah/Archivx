import { getRarityTierInfo, toPercentNumber } from "@/lib/steam/rarityTier";

type Props = {
  /** Steam / caches may send a string; we coerce for display. */
  percent: number | string | null | undefined;
};

export function RarityBadge({ percent: percentRaw }: Props) {
  const percent = toPercentNumber(percentRaw);
  const t = getRarityTierInfo(percent);
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
