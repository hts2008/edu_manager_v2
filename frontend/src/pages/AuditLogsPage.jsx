import { useMemo, useState } from "react";
import DataTable from "../components/ui/DataTable";
import { activityLogsService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";

const actionLabels = {
  API_POST: "Tạo/cập nhật",
  API_PUT: "Cập nhật",
  API_PATCH: "Cập nhật",
  API_DELETE: "Xóa",
  CREATE_PAYMENT: "Tạo phiếu chi",
  DELETE_PAYMENT: "Xóa phiếu chi",
  CREATE_RECEIPT: "Tạo phiếu thu",
  DELETE_RECEIPT: "Xóa phiếu thu",
  COLLECT_FEE: "Thu học phí",
  PASSWORD_CHANGED: "Đổi mật khẩu",
  LOGOUT: "Đăng xuất",
};

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function actionBadge(action) {
  const label = actionLabels[action] || action;
  const color = action?.includes("DELETE")
    ? "bg-red-100 text-red-700"
    : action?.includes("POST") || action?.includes("CREATE")
      ? "bg-emerald-100 text-emerald-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function AuditLogsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [filters, setFilters] = useState({
    from: "",
    to: today,
    action: "",
    entity_type: "",
  });

  const requestKey = JSON.stringify(filters);
  const { data, loading, error, reload } = useAsyncData(async () => {
    const response = await activityLogsService.getAll({
      ...filters,
      limit: 100,
    });
    if (!response.success) {
      throw new Error(response.error?.message || "Không tải được nhật ký");
    }
    return response.data;
  }, requestKey);

  const logs = data?.logs || [];
  const latest = logs[0];
  const uniqueUsers = useMemo(
    () => new Set(logs.map((item) => item.user_id).filter(Boolean)).size,
    [logs]
  );

  const columns = [
    {
      key: "created_at",
      title: "Thời gian",
      render: (value) => formatDateTime(value),
    },
    {
      key: "user_name",
      title: "Người dùng",
      render: (value, row) => (
        <div>
          <p className="font-medium text-gray-900">{value || row.username || "Không rõ"}</p>
          <p className="text-xs text-gray-500">{row.user_role || ""}</p>
        </div>
      ),
    },
    {
      key: "action",
      title: "Hành động",
      render: (value) => actionBadge(value),
    },
    {
      key: "entity_type",
      title: "Đối tượng",
      render: (value, row) => (
        <div className="max-w-xs">
          <p className="text-gray-900">{value || "api_route"}</p>
          <p className="truncate text-xs text-gray-500">{row.entity_id || ""}</p>
        </div>
      ),
    },
    {
      key: "ip_address",
      title: "IP",
      render: (value) => <span className="text-xs text-gray-600">{value || ""}</span>,
    },
  ];

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký hoạt động</h1>
          <p className="text-gray-500">Theo dõi thao tác hệ thống và audit mutation.</p>
        </div>
        <button onClick={reload} className="btn-secondary self-start lg:self-auto">
          Làm mới
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-500">Tổng bản ghi</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data?.total || 0}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-500">Người dùng liên quan</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{uniqueUsers}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-500">Mới nhất</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {latest ? formatDateTime(latest.created_at) : "Chưa có dữ liệu"}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
              className="input"
              aria-label="Từ ngày"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
              className="input"
              aria-label="Đến ngày"
            />
            <input
              type="text"
              value={filters.action}
              onChange={(event) => updateFilter("action", event.target.value)}
              className="input"
              placeholder="Lọc hành động"
            />
            <input
              type="text"
              value={filters.entity_type}
              onChange={(event) => updateFilter("entity_type", event.target.value)}
              className="input"
              placeholder="Lọc đối tượng"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="Chưa có nhật ký hoạt động"
        pageSize={20}
      />
    </div>
  );
}
