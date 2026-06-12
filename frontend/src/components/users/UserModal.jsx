import ActionProgressButton from "../ui/ActionProgressButton";
import Modal from "../ui/Modal";

export default function UserModal({
  modal,
  form,
  setForm,
  password,
  setPassword,
  submitting = false,
  onClose,
  onSubmitUser,
  onSubmitReset,
}) {
  if (!modal) return null;

  return (
    <Modal
      isOpen={Boolean(modal)}
      onClose={onClose}
      title={modal.title}
      size="lg"
      busy={submitting}
      busyLabel="Đang xử lý tài khoản..."
      confirmOnClose
      confirmCloseMessage="Bạn có thay đổi chưa lưu. Đóng hộp thoại sẽ bỏ các thay đổi này."
    >
      {modal.type === "reset" ? (
        <form onSubmit={onSubmitReset} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            placeholder="Mật khẩu mới"
            aria-label="Mật khẩu mới"
            disabled={submitting}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary disabled:opacity-60">
              Hủy
            </button>
            <ActionProgressButton type="submit" loading={submitting} className="btn-primary" loadingLabel="Đang đặt lại...">
              Đặt lại
            </ActionProgressButton>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmitUser} className="space-y-4">
          {modal.type === "create" && (
            <>
              <input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                className="input"
                placeholder="Username"
                aria-label="Username"
                disabled={submitting}
              />
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="input"
                placeholder="Mật khẩu"
                aria-label="Mật khẩu"
                disabled={submitting}
              />
            </>
          )}

          <input
            value={form.full_name}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
            className="input"
            placeholder="Họ tên"
            aria-label="Họ tên"
            disabled={submitting}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              className="input"
              aria-label="Vai trò"
              disabled={submitting}
            >
              <option value="admin">Admin</option>
              <option value="receptionist">Lễ tân</option>
            </select>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="input"
              aria-label="Trạng thái tài khoản"
              disabled={submitting}
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
              disabled={submitting}
            />
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="input"
              placeholder="Số điện thoại"
              aria-label="Số điện thoại"
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary disabled:opacity-60">
              Hủy
            </button>
            <ActionProgressButton type="submit" loading={submitting} className="btn-primary" loadingLabel="Đang lưu...">
              Lưu
            </ActionProgressButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
