// VI: Empty state component khi không có dữ liệu

export default function EmptyState({ 
  icon = '📭', 
  title = 'Không có dữ liệu', 
  message = 'Chưa có dữ liệu nào',
  action,
  actionLabel = 'Thêm mới'
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-6xl mb-4">{icon}</span>
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
