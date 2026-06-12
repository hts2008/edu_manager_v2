const statusStyles = {
  running: "border-primary-100 bg-primary-50 text-primary-800",
  success: "border-emerald-100 bg-emerald-50 text-emerald-800",
  warning: "border-amber-100 bg-amber-50 text-amber-800",
  error: "border-rose-100 bg-rose-50 text-rose-800",
};

export default function LongOperationStatus({
  title = "Dang xu ly tac vu",
  message = "Tac vu nay co the mat them vai giay.",
  steps = [],
  activeStep = 0,
  status = "running",
  elapsedLabel,
  onRetry,
  onCancel,
}) {
  const style = statusStyles[status] || statusStyles.running;

  return (
    <section className={`rounded-2xl border px-4 py-3 shadow-sm ${style}`} aria-live="polite" aria-busy={status === "running"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {status === "running" && (
              <span className="h-3 w-3 shrink-0 rounded-full bg-current motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            )}
            <h3 className="text-sm font-black">{title}</h3>
          </div>
          <p className="mt-1 text-sm font-semibold opacity-80">{message}</p>
          {elapsedLabel && <p className="mt-1 text-xs font-bold opacity-70">{elapsedLabel}</p>}
        </div>
        {(onRetry || onCancel) && (
          <div className="flex shrink-0 gap-2">
            {onRetry && (
              <button type="button" onClick={onRetry} className="rounded-xl bg-white/80 px-3 py-2 text-xs font-black shadow-sm">
                Thu lai
              </button>
            )}
            {onCancel && (
              <button type="button" onClick={onCancel} className="rounded-xl bg-white/70 px-3 py-2 text-xs font-black shadow-sm">
                Huy
              </button>
            )}
          </div>
        )}
      </div>
      {steps.length > 0 && (
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep && status === "running";
            return (
              <li key={step} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold shadow-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${done ? "bg-emerald-500" : active ? "bg-primary-500" : "bg-slate-300"}`} aria-hidden="true" />
                <span>{step}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
