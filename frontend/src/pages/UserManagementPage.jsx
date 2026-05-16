import { useState } from "react";
import { usersService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";
import UserModal from "../components/users/UserModal";

const emptyForm = {
  username: "",
  password: "",
  full_name: "",
  role: "receptionist",
  email: "",
  phone: "",
  status: "active",
};

function roleLabel(role) {
  return role === "admin" ? "Admin" : "Lễ tân";
}

function statusLabel(status) {
  return status === "active" ? "Đang hoạt động" : "Đã khóa";
}

function validateUserForm(form, mode) {
  if (mode === "create" && !form.username.trim()) return "username is required";
  if (mode === "create" && form.password.length < 6) {
    return "password must be at least 6 characters";
  }
  if (!form.full_name.trim()) return "full_name is required";
  return null;
}

export default function UserManagementPage() {
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestKey = JSON.stringify(filters);
  const { data, loading, reload } = useAsyncData(async () => {
    const response = await usersService.getAll(filters);
    if (!response.success) {
      throw new Error(response.error?.message || "Không tải được danh sách người dùng");
    }
    return response.data;
  }, requestKey, { initialData: { users: [], total: 0 } });

  const users = data?.users || [];

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setMessage("");
    setModal({ type: "create", title: "Thêm người dùng" });
  }

  function openEdit(user) {
    setForm({
      username: user.username,
      password: "",
      full_name: user.full_name || "",
      role: user.role || "receptionist",
      email: user.email || "",
      phone: user.phone || "",
      status: user.status || "active",
    });
    setError("");
    setMessage("");
    setModal({ type: "edit", title: "Cập nhật người dùng", user });
  }

  function openReset(user) {
    setPassword("");
    setError("");
    setMessage("");
    setModal({ type: "reset", title: "Đặt lại mật khẩu", user });
  }

  function closeModal() {
    setModal(null);
    setError("");
  }

  async function submitUser(event) {
    event.preventDefault();
    if (!modal) return;

    const validation = validateUserForm(form, modal.type);
    if (validation) {
      setError(validation);
      return;
    }

    const payload = {
      full_name: form.full_name,
      role: form.role,
      email: form.email || null,
      phone: form.phone || null,
      status: form.status,
      ...(modal.type === "create"
        ? { username: form.username, password: form.password }
        : {}),
    };
    const response =
      modal.type === "create"
        ? await usersService.create(payload)
        : await usersService.update(modal.user.id, payload);

    if (!response.success) {
      setError(response.error?.message || "Không lưu được người dùng");
      return;
    }

    setMessage(modal.type === "create" ? "Đã thêm người dùng" : "Đã cập nhật người dùng");
    closeModal();
    reload();
  }

  async function submitReset(event) {
    event.preventDefault();
    if (!modal?.user) return;
    if (password.length < 6) {
      setError("password must be at least 6 characters");
      return;
    }

    const response = await usersService.resetPassword(modal.user.id, password);
    if (!response.success) {
      setError(response.error?.message || "Không đặt lại được mật khẩu");
      return;
    }

    setMessage("Đã đặt lại mật khẩu");
    closeModal();
  }

  async function deactivateUser(user) {
    if (!window.confirm(`Khóa tài khoản ${user.username}?`)) return;
    const response = await usersService.deactivate(user.id);
    if (!response.success) {
      setError(response.error?.message || "Không khóa được tài khoản");
      return;
    }
    setMessage("Đã khóa tài khoản");
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="text-gray-500">Quản trị tài khoản, vai trò và trạng thái truy cập.</p>
        </div>
        <button onClick={openCreate} className="btn-primary self-start lg:self-auto">
          Thêm người dùng
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_120px]">
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              className="input"
              placeholder="Tìm username, họ tên, email, số điện thoại"
              aria-label="Tìm người dùng"
            />
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              className="input"
              aria-label="Trạng thái"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã khóa</option>
            </select>
            <button onClick={reload} className="btn-secondary">
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {message && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Danh sách người dùng</h2>
          {loading && <div className="spinner h-5 w-5"></div>}
        </div>
        <div className="card-body overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Username</th>
                <th className="py-2 pr-4 font-medium">Họ tên</th>
                <th className="py-2 pr-4 font-medium">Vai trò</th>
                <th className="py-2 pr-4 font-medium">Trạng thái</th>
                <th className="py-2 pr-4 font-medium">Lần đăng nhập cuối</th>
                <th className="py-2 pr-4 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-900">{user.username}</td>
                  <td className="py-2 pr-4">{user.full_name}</td>
                  <td className="py-2 pr-4">{roleLabel(user.role)}</td>
                  <td className="py-2 pr-4">{statusLabel(user.status)}</td>
                  <td className="py-2 pr-4">
                    {user.last_login ? new Date(user.last_login).toLocaleString("vi-VN") : "-"}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEdit(user)} className="text-sm text-blue-700">
                        Sửa
                      </button>
                      <button onClick={() => openReset(user)} className="text-sm text-amber-700">
                        Đặt mật khẩu
                      </button>
                      {user.status === "active" && (
                        <button onClick={() => deactivateUser(user)} className="text-sm text-red-700">
                          Khóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    Chưa có người dùng phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        modal={modal}
        form={form}
        setForm={setForm}
        password={password}
        setPassword={setPassword}
        onClose={closeModal}
        onSubmitUser={submitUser}
        onSubmitReset={submitReset}
      />
    </div>
  );
}
