import { asyncCopy } from "../../design/tokens";

export default function ActionProgressButton({
  children,
  loading = false,
  loadingLabel = asyncCopy.action,
  disabled = false,
  className = "btn-primary",
  type = "button",
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 ${className} disabled:cursor-not-allowed disabled:opacity-60`}
      {...props}
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}
