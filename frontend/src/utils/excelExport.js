import * as XLSX from 'xlsx';

// VI: Utility functions cho export Excel

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Filename without extension
 * @param {string} sheetName - Name of the sheet
 * @param {Array} columns - Column definitions [{key, title}]
 */
export function exportToExcel(data, filename, sheetName = 'Sheet1', columns = null) {
  // If columns provided, map data to specified columns
  let exportData = data;
  let headers = null;
  
  if (columns && columns.length > 0) {
    headers = columns.map(col => col.title);
    exportData = data.map(row => {
      const newRow = {};
      columns.forEach(col => {
        newRow[col.title] = row[col.key] ?? '';
      });
      return newRow;
    });
  }
  
  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
  
  // Auto-size columns
  const colWidths = [];
  if (columns) {
    columns.forEach((col, i) => {
      let maxWidth = col.title.length;
      data.forEach(row => {
        const value = String(row[col.key] ?? '');
        if (value.length > maxWidth) maxWidth = value.length;
      });
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    });
    worksheet['!cols'] = colWidths;
  }
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate file and trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export students list to Excel
 */
export function exportStudents(students) {
  const columns = [
    { key: 'id', title: 'Mã HV' },
    { key: 'full_name', title: 'Họ tên' },
    { key: 'date_of_birth', title: 'Ngày sinh' },
    { key: 'gender', title: 'Giới tính' },
    { key: 'phone', title: 'Điện thoại' },
    { key: 'school', title: 'Trường' },
    { key: 'status', title: 'Trạng thái' },
  ];
  exportToExcel(students, 'danh_sach_hoc_vien', 'Học viên', columns);
}

/**
 * Export financial report to Excel
 */
export function exportFinancialReport(data, dateRange) {
  const { receipts = [], payments = [], summary = {} } = data;
  
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['BÁO CÁO TÀI CHÍNH'],
    [`Từ ${dateRange.from} đến ${dateRange.to}`],
    [],
    ['Chỉ tiêu', 'Số tiền (VNĐ)'],
    ['Tổng thu', summary.totalReceipts || 0],
    ['Tổng chi', summary.totalPayments || 0],
    ['Cân đối', (summary.totalReceipts || 0) - (summary.totalPayments || 0)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng hợp');
  
  // Receipts sheet
  if (receipts.length > 0) {
    const receiptsSheet = XLSX.utils.json_to_sheet(receipts.map(r => ({
      'Mã phiếu': r.id,
      'Ngày': new Date(r.created_at).toLocaleDateString('vi-VN'),
      'Học viên': r.student_name,
      'Số tiền': r.amount,
      'Phương thức': r.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
    })));
    XLSX.utils.book_append_sheet(workbook, receiptsSheet, 'Phiếu thu');
  }
  
  // Payments sheet
  if (payments.length > 0) {
    const paymentsSheet = XLSX.utils.json_to_sheet(payments.map(p => ({
      'Mã phiếu': p.id,
      'Ngày': new Date(p.created_at).toLocaleDateString('vi-VN'),
      'Danh mục': p.category,
      'Người nhận': p.recipient_name,
      'Số tiền': p.amount,
    })));
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Phiếu chi');
  }
  
  XLSX.writeFile(workbook, `bao_cao_tai_chinh_${dateRange.from}_${dateRange.to}.xlsx`);
}

/**
 * Export transactions history to Excel
 */
export function exportTransactions(transactions) {
  const columns = [
    { key: 'created_at', title: 'Ngày' },
    { key: 'id', title: 'Mã giao dịch' },
    { key: 'type', title: 'Loại' },
    { key: 'description', title: 'Mô tả' },
    { key: 'amount', title: 'Số tiền' },
  ];
  
  // Format data
  const formattedData = transactions.map(t => ({
    ...t,
    created_at: t.created_at ? new Date(t.created_at).toLocaleDateString('vi-VN') : '',
    type: t.type === 'receipt' ? 'Thu' : 'Chi',
  }));
  
  exportToExcel(formattedData, 'lich_su_giao_dich', 'Giao dịch', columns);
}

export default { exportToExcel, exportStudents, exportFinancialReport, exportTransactions };
