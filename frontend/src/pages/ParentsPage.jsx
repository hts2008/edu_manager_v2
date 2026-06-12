import { useState, useEffect } from "react";
import { Plus, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { bulkActionsService, parentsService } from "../services/api";
import DataTable from "../components/ui/DataTable";
import BulkActionBar from "../components/ui/BulkActionBar";
import Modal, { ConfirmModal } from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import PageState from "../components/ui/PageState";
import {
  ListPanel,
  MetricGrid,
  OperationalPage,
  PageIntro,
} from "../components/ui/OperationalPage";

// VI: Trang danh sách phụ huynh - Premium Design
export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent, setSelectedParent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [selectedParentIds, setSelectedParentIds] = useState([]);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    loadParents();
  }, []);

  const loadParents = async () => {
    setLoading(true);
    setError("");
    const response = await parentsService.getAll();
    if (response.success) {
      setParents(response.data.parents);
      const currentIds = new Set((response.data.parents || []).map((parent) => parent.id));
      setSelectedParentIds((ids) => ids.filter((id) => currentIds.has(id)));
    } else {
      setError(response.error?.message || "Không thể tải danh sách phụ huynh");
    }
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!selectedParentIds.length) return;
    if (!window.confirm(`delete ${selectedParentIds.length} parents?`)) return;

    const response = await bulkActionsService.execute({
      resource: "parents",
      action: "delete",
      ids: selectedParentIds,
    });
    if (!response.success) {
      toast.error(response.error?.message || "Bulk delete failed");
      return;
    }

    const { requested, succeeded, failed } = response.data;
    if (failed) {
      toast.warning(`${succeeded}/${requested} processed; ${failed} failed`);
    } else {
      toast.success(`${succeeded}/${requested} processed`);
    }
    setSelectedParentIds([]);
    loadParents();
  };

  const handleDelete = async () => {
    if (selectedParent) {
      await parentsService.delete(selectedParent.id);
      loadParents();
      setSelectedParent(null);
    }
  };

  const handleEdit = (parent) => {
    setEditingParent(parent);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingParent(null);
    setShowForm(true);
  };

  const columns = [
    {
      key: "full_name",
      title: "Họ và tên",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-purple-200">
            {value?.charAt(0) || "?"}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {row.relationship === "father"
                ? "👨 Bố"
                : row.relationship === "mother"
                ? "👩 Mẹ"
                : "👤 Người giám hộ"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "Số điện thoại",
      render: (value) =>
        value ? (
          <a
            href={`tel:${value}`}
            className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <span>📞</span> {value}
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "email",
      title: "Email",
      render: (value) =>
        value ? (
          <a
            href={`mailto:${value}`}
            className="text-gray-600 hover:text-primary-600 text-sm truncate max-w-[200px] block"
          >
            {value}
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "address",
      title: "Địa chỉ",
      render: (value) =>
        value ? (
          <span className="text-sm text-gray-600 truncate-2 max-w-[250px] block">
            {value}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "children_count",
      title: "Học viên",
      render: (value) => <span className="badge-info">{value || 0} con</span>,
    },
    {
      key: "actions",
      title: "",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
            title="Sửa"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedParent(row);
              setShowDeleteConfirm(true);
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
            title="Xóa"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const fatherCount = parents.filter((p) => p.relationship === "father").length;
  const motherCount = parents.filter((p) => p.relationship === "mother").length;
  const guardianCount = parents.filter((p) => p.relationship === "guardian").length;
  const linkedChildren = parents.reduce((sum, parent) => sum + Number(parent.children_count || 0), 0);
  const summaryMetrics = [
    {
      label: "Phụ huynh",
      value: parents.length,
      helper: `${linkedChildren} học viên liên kết`,
      icon: UsersRound,
      tone: "indigo",
    },
    {
      label: "Bố",
      value: fatherCount,
      helper: "Vai trò liên hệ",
      icon: UserRound,
      tone: "sky",
    },
    {
      label: "Mẹ",
      value: motherCount,
      helper: "Vai trò liên hệ",
      icon: UserRound,
      tone: "rose",
    },
  ];
  const metrics = [
    ...summaryMetrics,
    {
      label: "Giám hộ",
      value: guardianCount,
      helper: "Người liên hệ khác",
      icon: ShieldCheck,
      tone: "amber",
    },
  ];

  if (error && !loading) {
    return (
      <PageState
        title="Chưa tải được phụ huynh"
        message={error}
        tone="red"
        action={loadParents}
        actionLabel="Tải lại"
      />
    );
  }

  return (
    <OperationalPage>
      <PageIntro
        eyebrow="Liên hệ gia đình"
        title="Phụ huynh"
        description="Quản lý người liên hệ, số điện thoại và mối liên kết với học viên để hỗ trợ vận hành thu phí và chăm sóc."
        status={`${parents.length} hồ sơ`}
        metrics={summaryMetrics}
        actions={
          <button onClick={handleAdd} className="btn-primary">
            <Plus size={18} aria-hidden="true" />
            Thêm phụ huynh
          </button>
        }
      />

      <MetricGrid metrics={metrics} />

      <div className="hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gradient">
            Phụ huynh
          </h1>
          <p className="text-gray-500 mt-1">
            Quản lý thông tin phụ huynh học viên
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="btn-primary shadow-lg shadow-primary-500/30"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Thêm phụ huynh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card stagger-item">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
              👨‍👩‍👧
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {parents.length}
              </p>
              <p className="text-sm text-gray-500">Tổng số</p>
            </div>
          </div>
        </div>
        <div className="stat-card stagger-item">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              👨
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {parents.filter((p) => p.relationship === "father").length}
              </p>
              <p className="text-sm text-gray-500">Bố</p>
            </div>
          </div>
        </div>
        <div className="stat-card stagger-item">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg">
              👩
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {parents.filter((p) => p.relationship === "mother").length}
              </p>
              <p className="text-sm text-gray-500">Mẹ</p>
            </div>
          </div>
        </div>
        <div className="stat-card stagger-item">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
              👤
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {parents.filter((p) => p.relationship === "guardian").length}
              </p>
              <p className="text-sm text-gray-500">Giám hộ</p>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Data Table */}
      <ListPanel
        title="Danh sách phụ huynh"
        description="Nhấn vào dòng để xem hoặc sửa thông tin liên hệ."
        countLabel={`${parents.length} hồ sơ`}
      >
      <BulkActionBar
        count={selectedParentIds.length}
        onClear={() => setSelectedParentIds([])}
        actions={[
          {
            label: "Delete",
            className: "btn-danger",
            onClick: handleBulkDelete,
          },
        ]}
      />
      <DataTable
        columns={columns}
        data={parents}
        loading={loading}
        onRowClick={handleEdit}
        selectable
        selectedIds={selectedParentIds}
        onSelectionChange={setSelectedParentIds}
        emptyMessage="Chưa có phụ huynh nào"
      />
      </ListPanel>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa phụ huynh "${selectedParent?.full_name}"?`}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        confirmOnClose
        confirmCloseMessage="Ban co thay doi chua luu trong ho so phu huynh. Dong hop thoai se bo cac thay doi nay."
        title={editingParent ? "Sửa phụ huynh" : "Thêm phụ huynh mới"}
      >
        <ParentForm
          parent={editingParent}
          onSuccess={() => {
            setShowForm(false);
            loadParents();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </OperationalPage>
  );
}

function ParentForm({ parent, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: parent?.full_name || "",
    phone: parent?.phone || "",
    email: parent?.email || "",
    address: parent?.address || "",
    relationship: parent?.relationship || "father",
    notes: parent?.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [children, setChildren] = useState([]);

  useEffect(() => {
    if (parent?.id) {
      loadChildren();
    }
  }, [parent]);

  const loadChildren = async () => {
    const { studentsService } = await import("../services/api");
    const res = await studentsService.getAll({ parent_id: parent.id });
    if (res.success) {
      const filtered = (res.data.students || []).filter(
        (s) => s.parent_id === parent.id
      );
      setChildren(filtered);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError("Vui lòng nhập họ tên");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Vui lòng nhập số điện thoại");
      return;
    }

    setLoading(true);
    try {
      const response = parent
        ? await parentsService.update(parent.id, formData)
        : await parentsService.create(formData);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error?.message || "Có lỗi xảy ra");
      }
    } catch {
      setError("Không thể lưu dữ liệu");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Họ và tên *
        </label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
          className="input"
          placeholder="Nguyễn Văn A"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Số điện thoại *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="input"
            placeholder="0901234567"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Quan hệ
          </label>
          <select
            value={formData.relationship}
            onChange={(e) =>
              setFormData({ ...formData, relationship: e.target.value })
            }
            className="input"
          >
            <option value="father">👨 Bố</option>
            <option value="mother">👩 Mẹ</option>
            <option value="guardian">👤 Người giám hộ</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="input"
          placeholder="email@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Địa chỉ
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          className="input"
          placeholder="123 Đường ABC, Quận 1, TP.HCM"
        />
      </div>

      {/* Children Section */}
      {parent && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            👧 Con em ({children.length})
          </label>
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 max-h-40 overflow-y-auto">
            {children.length === 0 ? (
              <div className="text-center py-4">
                <span className="text-2xl">📭</span>
                <p className="text-sm text-gray-500 mt-2">
                  Chưa có học viên nào liên kết
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
                        {child.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {child.full_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {child.class_names || "Chưa có lớp"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        child.status === "active"
                          ? "badge-success"
                          : "badge-error"
                      }`}
                    >
                      {child.status === "active" ? "Đang học" : "Nghỉ học"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 Để liên kết học viên, hãy chỉnh sửa học viên và chọn phụ huynh
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Ghi chú
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input"
          rows={2}
          placeholder="Ghi chú thêm..."
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 -mb-5 flex justify-end gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-10px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur md:-mx-8 md:-mb-6 md:px-8">
        <button type="button" onClick={onCancel} data-modal-close className="btn-secondary">
          Hủy
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="spinner w-4 h-4"></span> Đang lưu...
            </span>
          ) : parent ? (
            "Cập nhật"
          ) : (
            "Thêm mới"
          )}
        </button>
      </div>
    </form>
  );
}
