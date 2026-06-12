import { useEffect, useMemo, useState } from "react";
import { recycleBinService } from "../services/api";
import ActionProgressButton from "../components/ui/ActionProgressButton";
import { ConfirmModal } from "../components/ui/Modal";

const resources = [
  { value: "", label: "All" },
  { value: "students", label: "Students" },
  { value: "parents", label: "Parents" },
  { value: "receipts", label: "Receipts" },
  { value: "payments", label: "Payments" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function itemMeta(item) {
  if (item.resource === "payments") {
    return `${item.category || "-"} - ${formatCurrency(item.amount)}`;
  }
  if (item.resource === "receipts") {
    return `${item.month || "-"} - ${formatCurrency(item.amount)}`;
  }
  if (item.resource === "parents") {
    return `${item.phone || "-"} - ${item.children_count || 0} children`;
  }
  return item.parent_name || item.status || "-";
}

export default function RecycleBinPage() {
  const [resource, setResource] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadItems(nextResource = resource) {
    setLoading(true);
    setError("");
    try {
      const response = await recycleBinService.getAll(nextResource);
      if (!response.success) {
        setError(response.error?.message || "Unable to load recycle bin");
        return;
      }
      setData(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems(resource);
  }, [resource]);

  const items = useMemo(() => data?.items || [], [data]);

  async function runAction(action, item) {
    const actionKey = `${action}:${item.resource}:${item.id}`;
    setActionBusy(actionKey);
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response =
        action === "restore"
          ? await recycleBinService.restore(item.resource, item.id)
          : await recycleBinService.purge(item.resource, item.id);
      if (!response.success) {
        setError(response.error?.message || `${action} failed`);
        return;
      }
      setMessage(`${action} completed`);
      setPurgeTarget(null);
      await loadItems(resource);
    } finally {
      setLoading(false);
      setActionBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recycle Bin</h1>
          <p className="text-gray-500">Restore or permanently purge soft-deleted records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="input w-44"
            value={resource}
            onChange={(event) => setResource(event.target.value)}
            aria-label="Recycle resource"
          >
            {resources.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button onClick={() => loadItems(resource)} disabled={loading} className="btn-secondary disabled:opacity-50">
            Refresh
          </button>
        </div>
      </div>

      {message && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        {resources.slice(1).map((item) => (
          <div key={item.value} className="card">
            <div className="card-body">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{data?.by_resource?.[item.value]?.length || 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Deleted records</h2>
          {loading && <div className="spinner h-5 w-5" />}
        </div>
        <div className="card-body overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Resource</th>
                <th className="py-2 pr-4 font-medium">Record</th>
                <th className="py-2 pr-4 font-medium">Details</th>
                <th className="py-2 pr-4 font-medium">Deleted at</th>
                <th className="py-2 pr-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.resource}-${item.id}`} className="border-b last:border-0">
                  <td className="py-2 pr-4 capitalize">{item.resource}</td>
                  <td className="py-2 pr-4 font-medium text-gray-900">{item.label}</td>
                  <td className="py-2 pr-4">{itemMeta(item)}</td>
                  <td className="py-2 pr-4">{item.deleted_at ? new Date(item.deleted_at).toLocaleString() : "-"}</td>
                  <td className="py-2 pl-4">
                    <div className="flex justify-end gap-2">
                      <ActionProgressButton
                        onClick={() => runAction("restore", item)}
                        loading={actionBusy === `restore:${item.resource}:${item.id}`}
                        disabled={loading}
                        className="btn-secondary text-xs disabled:opacity-50"
                        loadingLabel="Restoring..."
                      >
                        Restore
                      </ActionProgressButton>
                      <ActionProgressButton
                        onClick={() => setPurgeTarget(item)}
                        loading={actionBusy === `purge:${item.resource}:${item.id}`}
                        disabled={loading}
                        className="btn-danger text-xs disabled:opacity-50"
                        loadingLabel="Purging..."
                      >
                        Purge
                      </ActionProgressButton>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">
                    Recycle bin is empty
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(purgeTarget)}
        onClose={() => setPurgeTarget(null)}
        onConfirm={() => runAction("purge", purgeTarget)}
        title="Xóa vĩnh viễn"
        message={`Xóa vĩnh viễn "${purgeTarget?.label || ""}" khỏi thùng rác? Thao tác này không thể khôi phục.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
      />
    </div>
  );
}
