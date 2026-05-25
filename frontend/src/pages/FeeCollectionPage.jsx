import { useState, useEffect, useMemo } from 'react';
import { studentsService, monthlyFeesService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { openAuthenticatedPdf } from '../utils/pdfPrint';
import { toMonthKey } from '../utils/dateKeys';

// VI: Thu học phí theo tháng với đầy đủ thông tin học viên

const FEE_STATUS = {
  pending: { label: 'Chờ chốt', color: 'bg-gray-100 text-gray-700', icon: '⚪' },
  ready: { label: 'Sẵn sàng', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700', icon: '🔵' },
  paid: { label: 'Đã thu', color: 'bg-green-100 text-green-700', icon: '🟢' },
};

export default function FeeCollectionPage() {
  const [students, setStudents] = useState([]);
  const [feeData, setFeeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthKey(new Date()));
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    
    // Load all active students
    const studentsRes = await studentsService.getAll({ status: 'active' });
    if (studentsRes.success) {
      setStudents(studentsRes.data.students || []);
    }
    
    // Load monthly fees for selected month
    const feesRes = await monthlyFeesService.getAll({ month: selectedMonth });
    if (feesRes.success) {
      const feeMap = {};
      (feesRes.data.fees || []).forEach(f => {
        feeMap[f.student_id] = f;
      });
      setFeeData(feeMap);
    }
    
    setLoading(false);
  };

  // Calculate attendance and fee for each student
  const studentFees = useMemo(() => {
    return students.map(student => {
      const fee = feeData[student.id];
      return {
        ...student,
        fee,
        attendanceSummary: fee ? `${fee.total_days || 0} buổi` : 'Chưa chốt',
        feeAmount: fee?.total_amount || 0,
        feeStatus: fee?.status || 'pending',
      };
    });
  }, [students, feeData]);

  // Filter students
  const filteredStudents = useMemo(() => {
    if (statusFilter === 'all') return studentFees;
    return studentFees.filter(s => s.feeStatus === statusFilter);
  }, [studentFees, statusFilter]);

  // Summary statistics
  const summary = useMemo(() => {
    const total = studentFees.length;
    const pending = studentFees.filter(s => s.feeStatus === 'pending').length;
    const ready = studentFees.filter(s => s.feeStatus === 'ready').length;
    const confirmed = studentFees.filter(s => s.feeStatus === 'confirmed').length;
    const paid = studentFees.filter(s => s.feeStatus === 'paid').length;
    const totalAmount = studentFees.reduce((sum, s) => sum + (s.feeAmount || 0), 0);
    const paidAmount = studentFees.filter(s => s.feeStatus === 'paid').reduce((sum, s) => sum + (s.feeAmount || 0), 0);
    
    return { total, pending, ready, confirmed, paid, totalAmount, paidAmount };
  }, [studentFees]);

  const handlePay = (student) => {
    setSelectedStudent(student);
    setShowPayModal(true);
  };

  const confirmPayment = async () => {
    if (!selectedStudent) return;
    
    setProcessing(true);
    
    // If no fee record exists, calculate first
    let fee = selectedStudent.fee;
    if (!fee) {
      const calcRes = await monthlyFeesService.calculate(selectedStudent.id, selectedMonth);
      if (calcRes.success) {
        fee = calcRes.data;
      } else {
        toast.error('Không thể tính học phí');
        setProcessing(false);
        return;
      }
    }
    
    // Mark as paid
    const payRes = await monthlyFeesService.pay(fee.id, paymentMethod);
    if (payRes.success) {
      toast.success(`Đã thu ${new Intl.NumberFormat('vi-VN').format(fee.total_amount)}đ`);
      setShowPayModal(false);
      setSelectedStudent(null);
      loadData();
    } else {
      toast.error(payRes.error?.message || 'Lỗi khi thu tiền');
    }
    
    setProcessing(false);
  };

  const handleCalculateFee = async (studentId) => {
    const res = await monthlyFeesService.calculate(studentId, selectedMonth);
    if (res.success) {
      toast.success('Đã tính học phí');
      loadData();
    } else {
      toast.error(res.error?.message || 'Không thể tính học phí');
    }
  };

  const handlePrint = async (student) => {
    const fee = student.fee;
    if (!fee?.receipt_id) {
      toast.error('Chưa có phiếu thu');
      return;
    }

    try {
      await openAuthenticatedPdf(`/api/receipts/${fee.receipt_id}/pdf`);
    } catch (error) {
      toast.error(error?.message || 'Không thể tạo PDF. Vui lòng thử lại.');
    }
  };

  // Navigate months
  const navigateMonth = (delta) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(toMonthKey(date));
  };

  const columns = [
    {
      key: 'full_name',
      title: 'Học viên',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="font-medium text-primary-700">{value?.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class_names',
      title: 'Lớp học',
      render: (value) => value ? (
        <div className="flex flex-wrap gap-1">
          {value.split(', ').map((c, i) => (
            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {c}
            </span>
          ))}
        </div>
      ) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'attendanceSummary',
      title: 'Điểm danh',
      render: (value) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'feeAmount',
      title: 'Số tiền',
      render: (value) => (
        <span className="font-medium text-green-700">
          {value > 0 ? `${new Intl.NumberFormat('vi-VN').format(value)}đ` : '-'}
        </span>
      ),
    },
    {
      key: 'feeStatus',
      title: 'Trạng thái',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${FEE_STATUS[value]?.color}`}>
          {FEE_STATUS[value]?.icon} {FEE_STATUS[value]?.label}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Hành động',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.feeStatus === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCalculateFee(row.id); }}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Tính phí
            </button>
          )}
          {(row.feeStatus === 'ready' || row.feeStatus === 'confirmed') && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePay(row); }}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              💰 Thu tiền
            </button>
          )}
          {row.feeStatus === 'paid' && row.fee?.receipt_id && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrint(row); }}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              🖨️ In lại
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Thu học phí</h1>
          <p className="text-gray-500">Quản lý thu học phí theo tháng</p>
        </div>
      </div>

      {/* Month Navigation & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Month Picker */}
        <div className="card col-span-1">
          <div className="card-body">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tháng</label>
            <div className="flex items-center gap-2">
              <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">◀</button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input flex-1"
              />
              <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">▶</button>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="card bg-gray-50 border-gray-200">
          <div className="card-body text-center">
            <p className="text-2xl font-bold text-gray-600">{summary.total}</p>
            <p className="text-xs text-gray-500">Tổng HV</p>
          </div>
        </div>
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="card-body text-center">
            <p className="text-2xl font-bold text-yellow-600">{summary.pending + summary.ready + summary.confirmed}</p>
            <p className="text-xs text-yellow-700">Chờ thu</p>
          </div>
        </div>
        <div className="card bg-green-50 border-green-200">
          <div className="card-body text-center">
            <p className="text-2xl font-bold text-green-600">{summary.paid}</p>
            <p className="text-xs text-green-700">Đã thu</p>
          </div>
        </div>
        <div className="card bg-primary-50 border-primary-200">
          <div className="card-body text-center">
            <p className="text-lg font-bold text-primary-600">
              {new Intl.NumberFormat('vi-VN').format(summary.paidAmount)}đ
            </p>
            <p className="text-xs text-primary-700">
              / {new Intl.NumberFormat('vi-VN').format(summary.totalAmount)}đ
            </p>
          </div>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Tất cả', count: summary.total },
          { key: 'pending', label: 'Chờ chốt', count: summary.pending },
          { key: 'ready', label: 'Sẵn sàng', count: summary.ready },
          { key: 'confirmed', label: 'Đã xác nhận', count: summary.confirmed },
          { key: 'paid', label: 'Đã thu', count: summary.paid },
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === filter.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Students Table */}
      <DataTable
        columns={columns}
        data={filteredStudents}
        loading={loading}
        emptyMessage="Không có học viên nào"
      />

      {/* Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Xác nhận thu học phí"
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Học viên:</span>
                <span className="font-medium">{selectedStudent.full_name}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Tháng:</span>
                <span className="font-medium">{selectedMonth}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Số buổi:</span>
                <span className="font-medium">{selectedStudent.fee?.total_days || 0}</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium">Số tiền:</span>
                <span className="font-bold text-green-600">
                  {new Intl.NumberFormat('vi-VN').format(selectedStudent.feeAmount)}đ
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hình thức thanh toán
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'cash'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  💵 Tiền mặt
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === 'transfer'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  🏦 Chuyển khoản
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowPayModal(false)}
                className="btn-secondary"
              >
                Hủy
              </button>
              <button
                onClick={confirmPayment}
                disabled={processing}
                className="btn-primary"
              >
                {processing ? 'Đang xử lý...' : '✓ Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
