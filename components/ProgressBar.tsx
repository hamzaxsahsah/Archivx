"use client";

type Props = {
  value: number;
  max: number;
  className?: string;
};

export function ProgressBar({ value, max, className = "" }: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className={className}>
      <div className="relative h-2 overflow-hidden rounded-full bg-border/80">
        <div
          className="xp-fill h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
