/** Shared loading shell for App Router segment transitions (shows while RSC streams). */
export default function Loading() {
  return (
    <div className="space-y-8 pb-[env(safe-area-inset-bottom)] animate-fade-up">
      <div className="h-9 w-48 max-w-[70%] rounded-lg bg-white/[0.06] animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl animate-pulse"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />
    </div>
  );
}
