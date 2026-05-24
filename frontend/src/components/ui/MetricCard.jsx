const toneClasses = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  red: "border-red-100 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
};

export default function MetricCard({
  label,
  value,
  helper,
  tone = "slate",
  icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-normal text-slate-950">
            {value}
          </p>
          {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
        </div>
        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClasses[tone] || toneClasses.slate}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
