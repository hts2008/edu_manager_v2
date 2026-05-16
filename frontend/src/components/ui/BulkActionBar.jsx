export default function BulkActionBar({ count, actions = [], onClear }) {
  if (!count) return null;

  return (
    <div
      data-testid="bulk-action-bar"
      className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-sm font-semibold text-blue-900">{count} selected</p>
        <p className="text-xs text-blue-700">Bulk changes affect selected rows only.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={action.className || "btn-secondary"}
          >
            {action.label}
          </button>
        ))}
        <button type="button" onClick={onClear} className="btn-secondary">
          Clear
        </button>
      </div>
    </div>
  );
}
