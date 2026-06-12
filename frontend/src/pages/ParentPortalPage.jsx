import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import LoadingScene from "../components/ui/LoadingScene";
import PageState from "../components/ui/PageState";
import { parentPortalService } from "../services/api";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function ParentPortalPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPortal(isMounted = true) {
    setLoading(true);
    setError("");
    const response = await parentPortalService.me();
    if (!isMounted) return;
    if (!response.success) {
      setError(response.error?.message || "Không tải được cổng phụ huynh");
    } else {
      setData(response.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    loadPortal(mounted);
    return () => {
      mounted = false;
    };
  }, []);

  if (!localStorage.getItem("parentPortalToken")) {
    return <Navigate to="/parent-login" replace />;
  }

  function logout() {
    parentPortalService.logout();
    navigate("/parent-login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/70">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
                EduFlow Parent
              </span>
              <h1 className="mt-3 text-2xl font-black text-gray-900">Cổng phụ huynh</h1>
              <p className="mt-1 text-gray-500">
                {data?.parent?.full_name || "Góc xem thông tin học tập và học phí"}
              </p>
            </div>
            <button onClick={logout} className="btn-secondary self-start md:self-auto">
              Đăng xuất
            </button>
          </div>
        </section>

        {loading && (
          <LoadingScene
            label="Đang tải cổng phụ huynh..."
            detail="Hệ thống đang lấy học phí, phiếu thu và điểm danh ở chế độ chỉ xem."
          />
        )}

        {error && (
          <PageState
            title="Không tải được cổng phụ huynh"
            message={error}
            tone="red"
            action={() => loadPortal(true)}
            actionLabel="Tải lại"
          />
        )}

        {!loading && !error && data?.students?.map((student) => (
          <article key={student.id} className="card overflow-hidden">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">{student.full_name}</h2>
              <p className="text-sm text-gray-500">Trạng thái: {student.status}</p>
            </div>
            <div className="card-body grid gap-4 lg:grid-cols-3">
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Học phí</h3>
                <div className="space-y-2">
                  {student.fees.slice(0, 6).map((fee) => (
                    <div key={fee.id} className="rounded border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{fee.month}</div>
                      <div>{formatCurrency(fee.total_amount)} - {fee.status}</div>
                    </div>
                  ))}
                  {!student.fees.length && <p className="text-sm text-gray-500">Chưa có dữ liệu học phí</p>}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Phiếu thu</h3>
                <div className="space-y-2">
                  {student.receipts.slice(0, 6).map((receipt) => (
                    <div key={receipt.id} className="rounded border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{receipt.month}</div>
                      <div>{formatCurrency(receipt.amount)} - {receipt.payment_method}</div>
                    </div>
                  ))}
                  {!student.receipts.length && <p className="text-sm text-gray-500">Chưa có phiếu thu</p>}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Điểm danh</h3>
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {student.attendance.slice(0, 20).map((record) => (
                    <div key={record.id} className="rounded border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{record.date}</div>
                      <div>{record.status}</div>
                    </div>
                  ))}
                  {!student.attendance.length && <p className="text-sm text-gray-500">Chưa có dữ liệu điểm danh</p>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
