import { useMemo, useState } from "react";
import { receiptsService, reportsService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";
import { toDateKey } from "../utils/dateKeys";
import { useToast } from "../components/ui/Toast";

const REPORT_TYPES = [
  { value: "daily", label: "Ngày" },
  { value: "weekly", label: "Tuần" },
  { value: "monthly", label: "Tháng" },
  { value: "yearly", label: "Năm" },
];

const CATEGORY_LABELS = {
  salary: "Lương giáo viên",
  utility: "Điện/Nước",
  office: "Văn phòng phẩm",
  other: "Khác",
};

const CATEGORY_COLORS = {
  salary: "bg-violet-500",
  utility: "bg-sky-500",
  office: "bg-emerald-500",
  other: "bg-slate-500",
};

const STATUS_STYLES = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  confirmed: "border-sky-200 bg-sky-50 text-sky-700",
  ready: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-slate-200 bg-slate-50 text-slate-600",
  none: "border-slate-200 bg-white text-slate-400",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function monthLabel(month) {
  const [year, number] = String(month).split("-");
  return `${number}/${year}`;
}

function getInitialDateRange() {
  const now = new Date();
  return {
    from: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateKey(now),
  };
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [reportType, setReportType] = useState("monthly");
  const [studentQuery, setStudentQuery] = useState("");
  const [showOnlyAnomalies, setShowOnlyAnomalies] = useState(false);
  const [correctingReceiptId, setCorrectingReceiptId] = useState(null);
  const toast = useToast();

  const fromMonth = dateRange.from.slice(0, 7);
  const toMonth = dateRange.to.slice(0, 7);
  const financialKey = `${dateRange.from}:${dateRange.to}:${reportType}`;
  const feeKey = `${fromMonth}:${toMonth}`;

  const financialState = useAsyncData(async () => {
    const response = await reportsService.getFinancial({
      from: dateRange.from,
      to: dateRange.to,
      type: reportType,
    });
    if (!response.success) throw response.error || new Error("Financial report failed");
    return response.data;
  }, financialKey);

  const feeState = useAsyncData(async () => {
    const response = await reportsService.getStudentFees({
      from: fromMonth,
      to: toMonth,
    });
    if (!response.success) throw response.error || new Error("Student fee report failed");
    return response.data;
  }, feeKey);

  const financial = financialState.data;
  const studentFees = feeState.data;
  const financialPending = financialState.loading && !financial;
  const feesPending = feeState.loading && !studentFees;
  const studentRows = studentFees?.students || [];

  const totalReceipts =
    financial?.receipts?.reduce((sum, receipt) => sum + (receipt.amount || 0), 0) || 0;
  const totalPayments =
    financial?.payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  const balance = totalReceipts - totalPayments;

  const paymentsByCategory = useMemo(
    () =>
      financial?.payments?.reduce((acc, payment) => {
        acc[payment.category] = (acc[payment.category] || 0) + (payment.amount || 0);
        return acc;
      }, {}) || {},
    [financial?.payments]
  );

  const filteredStudentRows = useMemo(() => {
    const keyword = studentQuery.trim().toLowerCase();
    return studentRows.filter((student) => {
      if (showOnlyAnomalies && !(student.anomalies || []).length) return false;
      if (!keyword) return true;
      return [
        student.student_name,
        student.parent_name,
        student.parent_phone,
        student.class_names,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [showOnlyAnomalies, studentQuery, studentRows]);

  const handleCorrectReceipt = async (item, student) => {
    const receiptId = item.anomaly_detail?.receipt_ids?.[0] || item.receipt_ids?.[0];
    if (!receiptId) {
      toast.error("Không tìm thấy phiếu thu cần đối soát");
      return;
    }

    const reason = window.prompt(
      `Lý do hủy và tính lại phiếu ${receiptId} cho ${student.student_name}:`,
      "Đối soát phiếu thu có số buổi bằng 0 nhưng có số tiền"
    );
    if (!reason) return;

    setCorrectingReceiptId(receiptId);
    const response = await receiptsService.correct(receiptId, { reason });
    setCorrectingReceiptId(null);

    if (!response.success) {
      toast.error(response.error?.message || "Không thể đối soát phiếu thu");
      return;
    }

    toast.success("Đã hủy phiếu lỗi và tính lại học phí. Kiểm tra Thu tiền để thu lại nếu còn phải thu.");
    await Promise.all([feeState.reload(), financialState.reload()]);
  };

  const exportCsv = () => {
    const financialRows = [
      ["type", "id", "name", "category_or_month", "amount", "created_at"],
      ...(financial?.receipts || []).map((receipt) => [
        "receipt",
        receipt.id,
        receipt.student_name || "",
        receipt.month || "",
        receipt.amount || 0,
        receipt.created_at || "",
      ]),
      ...(financial?.payments || []).map((payment) => [
        "payment",
        payment.id,
        payment.recipient_name || "",
        payment.category || "",
        payment.amount || 0,
        payment.created_at || "",
      ]),
    ];

    const studentFeeRows = [
      [],
      ["student_fee_report", fromMonth, toMonth],
      [
        "student_id",
        "student_name",
        "classes",
        "months_paid",
        "total_paid",
        "total_expected",
        "outstanding",
        "anomalies",
      ],
      ...studentRows.map((student) => [
        student.student_id,
        student.student_name,
        student.class_names || "",
        student.months_paid || 0,
        student.total_paid || 0,
        student.total_expected || 0,
        student.outstanding_amount || 0,
        (student.anomalies || []).join("|"),
      ]),
    ];

    const csv = [...financialRows, ...studentFeeRows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-tai-chinh-${dateRange.from}-${dateRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-slate-950 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-200">
              Tài chính & học phí
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Báo cáo vận hành trung tâm
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Theo dõi thu chi, đối soát học phí theo từng học viên và phát hiện bất thường như đã thu tiền nhưng số buổi bằng 0.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportCsv} className="btn-secondary bg-white/95">
              Export CSV
            </button>
            <button type="button" onClick={() => window.print()} className="btn-primary">
              In báo cáo
            </button>
          </div>
        </div>
      </section>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReportType(option.value)}
                  className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                    reportType === option.value
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(event) =>
                  setDateRange((current) => ({ ...current, from: event.target.value }))
                }
                className="input w-auto"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(event) =>
                  setDateRange((current) => ({ ...current, to: event.target.value }))
                }
                className="input w-auto"
              />
            </div>
          </div>
          {(financialState.error || feeState.error) && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Một phần báo cáo chưa tải được. Vui lòng kiểm tra quyền truy cập hoặc API.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Tổng thu"
          value={financialPending ? "Đang tải" : formatCurrency(totalReceipts)}
          helper={financialPending ? "Đang lấy dữ liệu thu" : `${financial?.receipts?.length || 0} phiếu thu`}
          tone="emerald"
        />
        <MetricCard
          label="Tổng chi"
          value={financialPending ? "Đang tải" : formatCurrency(totalPayments)}
          helper={financialPending ? "Đang lấy dữ liệu chi" : `${financial?.payments?.length || 0} phiếu chi`}
          tone="rose"
        />
        <MetricCard
          label="Cân đối"
          value={financialPending ? "Đang tải" : formatCurrency(balance)}
          helper={financialPending ? "Không hiển thị số 0 khi đang tải" : balance >= 0 ? "Dương tiền" : "Âm tiền"}
          tone={balance >= 0 ? "sky" : "amber"}
        />
        <MetricCard
          label="Còn phải thu"
          value={feesPending ? "Đang tải" : formatCurrency(studentFees?.summary?.outstanding_amount || 0)}
          helper={feesPending ? "Đang đối soát học phí" : `${studentFees?.summary?.anomaly_count || 0} cảnh báo`}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="card p-6">
          <h3 className="mb-4 font-bold text-slate-900">Chi tiêu theo danh mục</h3>
          {financialPending ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-10 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : Object.keys(paymentsByCategory).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(paymentsByCategory).map(([category, amount]) => {
                const percent = totalPayments > 0 ? Math.round((amount / totalPayments) * 100) : 0;
                return (
                  <div key={category}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${CATEGORY_COLORS[category] || "bg-slate-500"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-400">{percent}%</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Chưa có dữ liệu chi tiêu trong khoảng đã chọn.
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Theo dõi học phí theo học viên</h3>
              <p className="text-sm text-slate-500">
                {monthLabel(fromMonth)} - {monthLabel(toMonth)} - {feesPending ? "đang tải" : `${filteredStudentRows.length} học viên`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOnlyAnomalies((value) => !value)}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                showOnlyAnomalies
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {showOnlyAnomalies ? "Đang lọc cảnh báo" : "Chỉ cảnh báo"}
            </button>
            <input
              type="search"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Tìm học viên, phụ huynh, lớp..."
              className="input md:max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Học viên</th>
                  <th className="px-3 py-3">Đã thu</th>
                  <th className="px-3 py-3">Còn phải thu</th>
                  <th className="min-w-[260px] px-3 py-3">Tháng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudentRows.map((student) => (
                  <tr key={student.student_id} className="align-top hover:bg-slate-50/70">
                    <td className="px-3 py-4">
                      <p className="font-bold text-slate-900">{student.student_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{student.class_names || "Chưa có lớp"}</p>
                      {student.anomalies?.length > 0 && (
                        <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                          Cần đối soát
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-bold text-emerald-600">{formatCurrency(student.total_paid)}</p>
                      <p className="text-xs text-slate-500">{student.months_paid || 0} tháng</p>
                    </td>
                    <td className="px-3 py-4">
                      <p
                        className={`font-bold ${
                          student.outstanding_amount > 0 ? "text-rose-600" : "text-slate-400"
                        }`}
                      >
                        {formatCurrency(student.outstanding_amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Dự kiến {formatCurrency(student.total_expected)}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex min-w-[250px] flex-wrap gap-1.5">
                        {(student.months || []).map((item) => (
                          <span
                            key={item.month}
                            title={`${monthLabel(item.month)} - ${item.total_days || 0} buổi - ${formatCurrency(item.paid_amount)}`}
                            className={`inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-1 text-xs font-bold ${
                              STATUS_STYLES[item.status] || STATUS_STYLES.none
                            } ${item.anomaly ? "ring-2 ring-amber-300" : ""}`}
                          >
                            {monthLabel(item.month)}
                            {item.anomaly_detail?.can_correct && (
                              <button
                                type="button"
                                disabled={
                                  correctingReceiptId === item.anomaly_detail.receipt_ids?.[0]
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCorrectReceipt(item, student);
                                }}
                                className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-black text-amber-900 hover:bg-amber-300 disabled:opacity-50"
                                title={item.anomaly_detail.message}
                              >
                                {correctingReceiptId === item.anomaly_detail.receipt_ids?.[0]
                                  ? "..."
                                  : "Sửa"}
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredStudentRows.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              {feesPending ? "Đang tải dữ liệu học phí..." : "Không có học viên phù hợp bộ lọc hiện tại."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper, tone }) {
  const toneClass = {
    emerald: "from-emerald-50 to-teal-50 text-emerald-700 border-emerald-100",
    rose: "from-rose-50 to-red-50 text-rose-700 border-rose-100",
    sky: "from-sky-50 to-blue-50 text-sky-700 border-sky-100",
    amber: "from-amber-50 to-orange-50 text-amber-700 border-amber-100",
    violet: "from-violet-50 to-indigo-50 text-violet-700 border-violet-100",
  }[tone];

  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-semibold opacity-75">{helper}</p>
    </div>
  );
}
