"use client";

type Props = {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function CompletionRing({
  value,
  max,
  size = 96,
  strokeWidth = 6,
  className = "",
}: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const cx = size / 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label={`${pct}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00b4d8" />
            <stop offset="60%" stopColor="#0ef" />
            <stop offset="100%" stopColor="#f4c542" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="#1e2330"
          strokeWidth={strokeWidth}
        />
        {/* fill */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <span
        className="absolute font-display text-lg font-bold leading-none text-white"
        style={{ fontSize: size < 80 ? "0.75rem" : undefined }}
      >
        {pct}%
      </span>
    </div>
  );
}
