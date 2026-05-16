import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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

  useEffect(() => {
    let mounted = true;
    parentPortalService.me().then((response) => {
      if (!mounted) return;
      if (!response.success) {
        setError(response.error?.message || "Unable to load parent portal");
      } else {
        setData(response.data);
      }
      setLoading(false);
    });
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
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
            <p className="text-gray-500">{data?.parent?.full_name || "Read-only family view"}</p>
          </div>
          <button onClick={logout} className="btn-secondary self-start md:self-auto">
            Logout
          </button>
        </div>

        {loading && <div className="card"><div className="card-body">Loading...</div></div>}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data?.students?.map((student) => (
          <div key={student.id} className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">{student.full_name}</h2>
              <p className="text-sm text-gray-500">Status: {student.status}</p>
            </div>
            <div className="card-body grid gap-4 lg:grid-cols-3">
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Fees</h3>
                <div className="space-y-2">
                  {student.fees.slice(0, 6).map((fee) => (
                    <div key={fee.id} className="rounded border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{fee.month}</div>
                      <div>{formatCurrency(fee.total_amount)} - {fee.status}</div>
                    </div>
                  ))}
                  {!student.fees.length && <p className="text-sm text-gray-500">No fee records</p>}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Receipts</h3>
                <div className="space-y-2">
                  {student.receipts.slice(0, 6).map((receipt) => (
                    <div key={receipt.id} className="rounded border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{receipt.month}</div>
                      <div>{formatCurrency(receipt.amount)} - {receipt.payment_method}</div>
                    </div>
                  ))}
                  {!student.receipts.length && <p className="text-sm text-gray-500">No receipts</p>}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Attendance</h3>
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {student.attendance.slice(0, 20).map((record) => (
                    <div key={record.id} className="rounded border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{record.date}</div>
                      <div>{record.status}</div>
                    </div>
                  ))}
                  {!student.attendance.length && <p className="text-sm text-gray-500">No attendance records</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
