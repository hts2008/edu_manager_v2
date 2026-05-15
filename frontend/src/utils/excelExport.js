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
  exportTransactions,
};
