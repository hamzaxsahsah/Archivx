"use client";

type Rank = {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow?: string;
};

const RANKS: { threshold: number; rank: Rank }[] = [
  {
    threshold: 100,
    rank: {
      label: "COMPLETIONIST",
      color: "text-gold",
      bg: "bg-gold/10",
      border: "border-gold/40",
      glow: "shadow-glow-gold animate-pulse-gold",
    },
  },
  {
    threshold: 75,
    rank: {
      label: "LEGEND",
      color: "text-gold",
      bg: "bg-gold/5",
      border: "border-gold/25",
    },
  },
  {
    threshold: 50,
    rank: {
      label: "ELITE",
      color: "text-purple-300",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
    },
  },
  {
    threshold: 25,
    rank: {
      label: "HUNTER",
      color: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/30",
    },
  },
  {
    threshold: 10,
    rank: {
      label: "SOLDIER",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/25",
    },
  },
  {
    threshold: 0,
    rank: {
      label: "ROOKIE",
      color: "text-zinc-400",
      bg: "bg-zinc-400/5",
      border: "border-zinc-500/30",
    },
  },
];

export function getRank(completionPct: number): Rank {
  for (const { threshold, rank } of RANKS) {
    if (completionPct >= threshold) return rank;
  }
  return RANKS[RANKS.length - 1].rank;
}

type Props = {
  completionPct: number;
  className?: string;
};

export function RankBadge({ completionPct, className = "" }: Props) {
  const rank = getRank(completionPct);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest ${rank.color} ${rank.bg} ${rank.border} ${rank.glow ?? ""} ${className}`}
    >
      <svg viewBox="0 0 8 8" className="h-1.5 w-1.5 fill-current" aria-hidden>
        <circle cx="4" cy="4" r="4" />
      </svg>
      {rank.label}
    </span>
  );
}
