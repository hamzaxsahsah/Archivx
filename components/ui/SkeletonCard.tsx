export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-surface p-3">
      <div className="mb-3 aspect-[2/3] w-full rounded-lg bg-white/5" />
      <div className="mb-2 h-3 w-4/5 rounded bg-white/5" />
      <div className="mb-3 h-2 w-full rounded bg-white/5" />
      <div className="h-2 w-2/3 rounded bg-white/5" />
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse gap-3 rounded-xl border border-border bg-surface p-3"
        >
          <div className="h-12 w-12 shrink-0 rounded-md bg-white/5" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-1/3 rounded bg-white/5" />
            <div className="h-2 w-full rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
