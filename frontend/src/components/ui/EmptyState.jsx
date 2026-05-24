// VI: Empty state component khi không có dữ liệu

export default function EmptyState({ 
  icon,
  title = 'Không có dữ liệu', 
  message = 'Chưa có dữ liệu nào',
  action,
  actionLabel = 'Thêm mới'
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
        {icon || (
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm">{message}</p>
      {action && (
        <button onClick={action} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
