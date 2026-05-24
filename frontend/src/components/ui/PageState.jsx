function StateIcon({ tone = "slate" }) {
  const toneClass = {
    slate: "border-slate-200 bg-slate-50 text-slate-500",
    red: "border-red-200 bg-red-50 text-red-600",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-xl border ${toneClass}`}
      aria-hidden="true"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 3.5h3.4L21 18H3L10.3 3.5z" />
      </svg>
    </div>
  );
}

export default function PageState({
  title,
  message,
  tone = "slate",
  action,
  actionLabel = "Thử lại",
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <StateIcon tone={tone} />
      <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
      {message && <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{message}</p>}
      {action && (
        <button type="button" onClick={action} className="btn-secondary mt-5">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
