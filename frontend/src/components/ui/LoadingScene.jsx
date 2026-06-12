import { asyncCopy } from "../../design/tokens";
import { LoadingProgress, SkeletonBlock } from "./LoadingStates";
import { CardGridSkeleton } from "./Skeletons";

export default function LoadingScene({
  label = asyncCopy.route,
  detail = "He thong dang nap du lieu va giu bo cuc on dinh.",
  variant = "page",
}) {
  return (
    <section className="space-y-4" aria-live="polite" aria-busy="true" data-testid="loading-scene">
      <LoadingProgress label={label} />
      {detail && (
        <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-500">
          {detail}
        </p>
      )}
      {variant === "table" ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <>
          <SkeletonBlock className="h-44" />
          <CardGridSkeleton />
          <SkeletonBlock className="h-72" />
        </>
      )}
    </section>
  );
}
