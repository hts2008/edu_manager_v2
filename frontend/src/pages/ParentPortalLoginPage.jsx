import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { parentPortalService } from "../services/api";

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
        <div className="card">
          <div className="card-header">
            <h1 className="text-xl font-bold text-gray-900">Parent Portal</h1>
            <p className="text-sm text-gray-500">Login with parent phone and student date of birth.</p>
          </div>
          <form onSubmit={submit} className="card-body space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="parent-phone">
                Parent phone
              </label>
              <input
                id="parent-phone"
                className="input"
                value={form.parent_phone}
                onChange={(event) => updateField("parent_phone", event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="student-dob">
                Student date of birth
              </label>
              <input
                id="student-dob"
                type="date"
                className="input"
                value={form.student_date_of_birth}
                onChange={(event) => updateField("student_date_of_birth", event.target.value)}
              />
            </div>
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <button disabled={loading} className="btn-primary w-full disabled:opacity-50">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
