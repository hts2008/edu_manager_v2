import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { parentPortalService } from "../services/api";
import ActionProgressButton from "../components/ui/ActionProgressButton";

export default function ParentPortalLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ parent_phone: "", student_date_of_birth: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await parentPortalService.login(form);
      if (!response.success) {
        setError(response.error?.message || "Login failed");
        return;
      }
      localStorage.setItem("parentPortalToken", response.data.token);
      navigate("/parent-portal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
          <div className="border-b border-slate-100 pb-4">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
              EduFlow Parent
            </span>
            <h1 className="mt-4 text-2xl font-black text-gray-900">Cổng phụ huynh</h1>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Đăng nhập bằng số điện thoại phụ huynh và ngày sinh học viên để xem học phí, phiếu thu và điểm danh.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4 pt-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="parent-phone">
                Số điện thoại phụ huynh
              </label>
              <input
                id="parent-phone"
                className="input"
                value={form.parent_phone}
                onChange={(event) => updateField("parent_phone", event.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="student-dob">
                Ngày sinh học viên
              </label>
              <input
                id="student-dob"
                type="date"
                className="input"
                value={form.student_date_of_birth}
                onChange={(event) => updateField("student_date_of_birth", event.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <ActionProgressButton type="submit" loading={loading} className="btn-primary w-full" loadingLabel="Đang xác thực...">
              Đăng nhập
            </ActionProgressButton>
          </form>
        </div>
      </div>
    </div>
  );
}
