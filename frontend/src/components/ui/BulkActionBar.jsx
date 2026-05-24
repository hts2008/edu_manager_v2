import { motion as Motion, AnimatePresence } from 'framer-motion';

export default function BulkActionBar({ count, actions = [], onClear }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <Motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
          data-testid="bulk-action-bar"
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-4 rounded-2xl border border-cyan-200/50 bg-gradient-to-r from-cyan-50 to-blue-50/50 p-4 shadow-lg shadow-cyan-900/5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <span className="text-lg font-black text-cyan-600">{count}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Bản ghi được chọn</p>
                <p className="text-xs font-medium text-slate-500">Các thay đổi sẽ chỉ áp dụng cho {count} mục này.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`${action.className || "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"} rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5`}
                >
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-slate-700"
              >
                Hủy chọn
              </button>
            </div>
          </div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
