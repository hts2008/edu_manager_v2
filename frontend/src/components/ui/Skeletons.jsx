import { asyncCopy } from "../../design/tokens";
import { SkeletonBlock } from "./LoadingStates";

export function TableSkeletonRows({
  columnCount,
  rowCount = 6,
  selectable = false,
  label = asyncCopy.table,
}) {
  const totalColumns = Math.max(1, Number(columnCount || 1)) + (selectable ? 1 : 0);

  return (
    <>
      <tr>
        <td colSpan={totalColumns} className="px-4 py-3">
          <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-bold text-primary-700" aria-live="polite" aria-busy="true">
            {label}
          </div>
        </td>
      </tr>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`} aria-hidden="true">
          {Array.from({ length: totalColumns }).map((__, columnIndex) => (
            <td key={`skeleton-cell-${rowIndex}-${columnIndex}`} className="px-4 py-4">
              <SkeletonBlock className={`h-4 rounded-lg ${columnIndex === 0 ? "w-10" : "w-full"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardGridSkeleton({ count = 4, className = "" }) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} className="h-28" />
      ))}
    </div>
  );
}
