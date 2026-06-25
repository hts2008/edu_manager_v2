import { motion as Motion, useReducedMotion } from "framer-motion";
import { getMotionTransition } from "../../design/motion";

const toneClasses = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    accent: "bg-indigo-500",
  },
  sky: {
    icon: "bg-sky-50 text-sky-700 ring-sky-100",
    accent: "bg-sky-500",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    accent: "bg-emerald-500",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 ring-amber-100",
    accent: "bg-amber-500",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700 ring-rose-100",
    accent: "bg-rose-500",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700 ring-slate-200",
    accent: "bg-slate-500",
  },
};

export function useOperationalMotion() {
  const reducedMotion = useReducedMotion();

  return {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: reducedMotion
          ? { duration: 0.01 }
          : { staggerChildren: 0.045, delayChildren: 0.02 },
      },
    },
    item: {
      hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
      visible: {
        opacity: 1,
        y: reducedMotion ? undefined : 0,
        transition: getMotionTransition({ reduced: reducedMotion, duration: "fast" }),
      },
    },
  };
}

export function OperationalPage({ children, className = "", ...props }) {
  const motion = useOperationalMotion();

  return (
    <Motion.div
      variants={motion.container}
      initial="hidden"
      animate="visible"
      className={`space-y-6 ${className}`}
      {...props}
    >
      {children}
    </Motion.div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  metrics = [],
  status,
}) {
  const motion = useOperationalMotion();

  return (
    <Motion.section
      variants={motion.item}
      className="eduflow-page-intro p-5 sm:p-7"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow && (
              <span className="eduflow-eyebrow">
                {eyebrow}
              </span>
            )}
            {status && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {status}
              </span>
            )}
          </div>
          <h1 className="eduflow-title mt-4 text-2xl font-black tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="eduflow-muted mt-2 max-w-3xl text-sm leading-6 sm:text-base">
              {description}
            </p>
          )}
          {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
        </div>

        {metrics.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <MetricTile key={metric.label} {...metric} compact />
            ))}
          </div>
        )}
      </div>
    </Motion.section>
  );
}

export function MetricGrid({ metrics }) {
  const motion = useOperationalMotion();

  return (
    <Motion.section
      variants={motion.container}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map((metric) => (
        <Motion.div key={metric.label} variants={motion.item}>
          <MetricTile {...metric} />
        </Motion.div>
      ))}
    </Motion.section>
  );
}

export function MetricTile({
  label,
  value,
  helper,
  icon: Icon,
  tone = "indigo",
  compact = false,
}) {
  const classes = toneClasses[tone] || toneClasses.indigo;

  return (
    <div className={`eduflow-metric p-4 ${compact ? "" : "sm:p-5"}`}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
        </div>
        {Icon && (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${classes.icon}`}
          >
            <Icon size={20} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full w-2/5 rounded-full ${classes.accent}`} />
      </div>
    </div>
  );
}

export function ListPanel({ title, description, countLabel, children, className = "" }) {
  const motion = useOperationalMotion();

  return (
    <Motion.section
      variants={motion.item}
      className={`eduflow-panel p-3 sm:p-4 ${className}`}
    >
      {(title || description || countLabel) && (
        <div className="mb-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-base font-black text-slate-950">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {countLabel && (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {countLabel}
            </span>
          )}
        </div>
      )}
      {children}
    </Motion.section>
  );
}
