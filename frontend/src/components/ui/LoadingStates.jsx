export const SAFE_RECHARTS_CONTAINER_PROPS = {
  minWidth: 1,
  minHeight: 1,
  initialDimension: { width: 1, height: 1 },
};

export function LoadingProgress({ label = "Dang tai du lieu...", className = "" }) {
  return (
    <div className={`eduflow-loading-scene p-4 ${className}`} aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
          <span className="absolute h-5 w-5 rounded-full bg-primary-500/20 motion-safe:animate-ping motion-reduce:animate-none" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary-600 shadow-[0_0_0_6px_rgba(79,70,229,0.08)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900">{label}</p>
          <div className="eduflow-loading-bars mt-2 grid gap-1.5">
            <span />
            <span className="w-4/5" />
            <span className="w-3/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-slate-200/70 bg-white/85 shadow-sm ${className}`}
      aria-hidden="true"
    >
      <div className="h-full w-full bg-[linear-gradient(100deg,rgba(248,250,252,0)_30%,rgba(99,102,241,0.12)_50%,rgba(248,250,252,0)_70%)] bg-[length:220%_100%] motion-safe:animate-[shimmer_1.6s_ease-in-out_infinite] motion-reduce:animate-none" />
    </div>
  );
}

export function RouteLoading({ label = "Dang tai giao dien..." }) {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true" data-testid="route-loading">
      <LoadingProgress label={label} />
      <SkeletonBlock className="h-44" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <SkeletonBlock key={item} className="h-28" />
        ))}
      </div>
      <SkeletonBlock className="h-80" />
    </div>
  );
}

export function AuthLoading() {
  return (
    <div className="eduflow-app-shell flex min-h-screen items-start justify-center px-4 pt-24">
      <div className="w-full max-w-lg">
        <LoadingProgress label="Dang xac thuc phien lam viec..." />
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-40 rounded-lg" />
            <SkeletonBlock className="h-4 w-full rounded-lg" />
            <SkeletonBlock className="h-4 w-2/3 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartFrame({ children, height = 288, className = "", testId }) {
  const resolvedHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`relative w-full min-w-0 overflow-hidden ${className}`}
      style={{ height: resolvedHeight, minHeight: resolvedHeight }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
