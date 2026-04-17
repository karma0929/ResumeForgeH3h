function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-3xl bg-slate-200/70 ${className}`} />;
}

export function DashboardShellLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-28" />
        <SkeletonBlock className="h-12 w-72 max-w-full" />
        <SkeletonBlock className="h-4 w-[36rem] max-w-full" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-36" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-72" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
      </div>
    </div>
  );
}
