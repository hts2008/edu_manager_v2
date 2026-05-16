export default function UserModal({
  modal,
  form,
  setForm,
  password,
  setPassword,
  onClose,
  onSubmitUser,
  onSubmitReset,
}) {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{modal.title}</h2>
        </div>
        {modal.type === "reset" ? (
          <form onSubmit={onSubmitReset} className="space-y-4 p-5">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
              placeholder="Mật khẩu mới"
              aria-label="Mật khẩu mới"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Hủy
              </button>
              <button type="submit" className="btn-primary">
                Đặt lại
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={onSubmitUser} className="space-y-4 p-5">
            {modal.type === "create" && (
              <>
                <input
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  className="input"
                  placeholder="Username"
                  aria-label="Username"
                />
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="input"
                  placeholder="Mật khẩu"
                  aria-label="Mật khẩu"
                />
              </>
            )}
            <input
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              className="input"
              placeholder="Họ tên"
              aria-label="Họ tên"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                className="input"
                aria-label="Vai trò"
              >
                <option value="admin">Admin</option>
                <option value="receptionist">Lễ tân</option>
              </select>
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className="input"
                aria-label="Trạng thái tài khoản"
              >
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đã khóa</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="input"
                placeholder="Email"
                aria-label="Email"
              />
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="input"
                placeholder="Số điện thoại"
                aria-label="Số điện thoại"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Hủy
              </button>
              <button type="submit" className="btn-primary">
                Lưu
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
