// CSV export utilities. Files keep the existing export function names because
// callers treat them as spreadsheet exports, and CSV opens cleanly in Excel.

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function escapeCsvCell(value) {
  const text = normalizeValue(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function downloadCsv(filename, rows) {
  const csv = `\uFEFF${rowsToCsv(rows)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToExcel(data, filename, sheetName = "Sheet1", columns = null) {
  const keys = columns?.length ? columns.map((col) => col.key) : Object.keys(data[0] || {});
  const headers = columns?.length ? columns.map((col) => col.title) : keys;
  const rows = [[sheetName], [], headers];

  data.forEach((row) => {
    rows.push(keys.map((key) => row[key] ?? ""));
  });

  downloadCsv(filename, rows);
}

export function exportStudents(students) {
  const columns = [
    { key: "id", title: "Ma HV" },
    { key: "full_name", title: "Ho ten" },
    { key: "date_of_birth", title: "Ngay sinh" },
    { key: "gender", title: "Gioi tinh" },
    { key: "phone", title: "Dien thoai" },
    { key: "school", title: "Truong" },
    { key: "status", title: "Trang thai" },
  ];
  exportToExcel(students, "danh_sach_hoc_vien", "Hoc vien", columns);
}

export function exportFinancialReport(data, dateRange) {
  const { receipts = [], payments = [], summary = {} } = data;
  const rows = [
    ["BAO CAO TAI CHINH"],
    [`Tu ${dateRange.from} den ${dateRange.to}`],
    [],
    ["Chi tieu", "So tien (VND)"],
    ["Tong thu", summary.totalReceipts || 0],
    ["Tong chi", summary.totalPayments || 0],
    ["Can doi", (summary.totalReceipts || 0) - (summary.totalPayments || 0)],
    [],
    ["PHIEU THU"],
    ["Ma phieu", "Ngay", "Hoc vien", "So tien", "Phuong thuc"],
    ...receipts.map((receipt) => [
      receipt.id,
      receipt.created_at ? new Date(receipt.created_at).toLocaleDateString("vi-VN") : "",
      receipt.student_name || "",
      receipt.amount || 0,
      receipt.payment_method === "cash" ? "Tien mat" : "Chuyen khoan",
    ]),
    [],
    ["PHIEU CHI"],
    ["Ma phieu", "Ngay", "Danh muc", "Nguoi nhan", "So tien"],
    ...payments.map((payment) => [
      payment.id,
      payment.created_at ? new Date(payment.created_at).toLocaleDateString("vi-VN") : "",
      payment.category || "",
      payment.recipient_name || "",
      payment.amount || 0,
    ]),
  ];

  downloadCsv(`bao_cao_tai_chinh_${dateRange.from}_${dateRange.to}`, rows);
}

export function exportAdvancedReport(data, dateRange) {
  const {
    revenue_trend: revenueTrend = [],
    teacher_utilization: teacherUtilization = [],
    retention_cohort: retentionCohort = [],
    summary = {},
  } = data || {};
  const rows = [
    ["BAO CAO NANG CAO"],
    [`Tu ${dateRange.from} den ${dateRange.to}`],
    [],
    ["TONG QUAN"],
    ["Tong thu", summary.total_receipts || 0],
    ["Tong chi", summary.total_payments || 0],
    ["Doanh thu rong", summary.net_revenue || 0],
    ["So lop dang hoat dong", summary.active_class_count || 0],
    [],
    ["XU HUONG DOANH THU"],
    ["Ky", "Tong thu", "Tong chi", "Doanh thu rong"],
    ...revenueTrend.map((item) => [
      item.period,
      item.total_receipts || 0,
      item.total_payments || 0,
      item.net_revenue || 0,
    ]),
    [],
    ["HIEU SUAT GIAO VIEN"],
    ["Giao vien", "Lop", "Hoc vien", "Buoi", "Co mat", "Ti le co mat"],
    ...teacherUtilization.map((item) => [
      item.teacher_name,
      item.active_classes || 0,
      item.active_students || 0,
      item.total_sessions || 0,
      item.present_sessions || 0,
      `${item.utilization_rate || 0}%`,
    ]),
    [],
    ["COHORT HOC VIEN"],
    ["Cohort", "Tong", "Dang hoc", "Tam dung", "Da tot nghiep", "Ti le duy tri"],
    ...retentionCohort.map((item) => [
      item.cohort,
      item.total_students || 0,
      item.active_students || 0,
      item.inactive_students || 0,
      item.graduated_students || 0,
      `${item.retention_rate || 0}%`,
    ]),
  ];

  downloadCsv(`bao_cao_nang_cao_${dateRange.from}_${dateRange.to}`, rows);
}

export function exportTransactions(transactions) {
  const columns = [
    { key: "created_at", title: "Ngay" },
    { key: "id", title: "Ma giao dich" },
    { key: "type", title: "Loai" },
    { key: "description", title: "Mo ta" },
    { key: "amount", title: "So tien" },
  ];

  const formattedData = transactions.map((transaction) => ({
    ...transaction,
    created_at: transaction.created_at
      ? new Date(transaction.created_at).toLocaleDateString("vi-VN")
      : "",
    type: transaction.type === "receipt" ? "Thu" : "Chi",
  }));

  exportToExcel(formattedData, "lich_su_giao_dich", "Giao dich", columns);
}

export default {
  exportToExcel,
  exportStudents,
  exportFinancialReport,
  exportAdvancedReport,
  exportTransactions,
};
