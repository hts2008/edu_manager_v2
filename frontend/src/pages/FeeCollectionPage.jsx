import { useRef, useState, useEffect, useMemo } from 'react';
import { Wallet, Printer, Calculator, Banknote, CreditCard, CheckCircle2 } from 'lucide-react';
import { studentsService, classesService, monthlyFeesService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { openAuthenticatedPdf } from '../utils/pdfPrint';
import { toMonthKey } from '../utils/dateKeys';

const FEE_STATUS = {
  pending: { label: 'Chờ chốt', color: 'bg-slate-100 text-slate-700', icon: '○' },
  ready: { label: 'Sẵn sàng', color: 'bg-amber-100 text-amber-700', icon: '●' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700', icon: '●' },
  paid: { label: 'Đã thu', color: 'bg-emerald-100 text-emerald-700', icon: '●' },
};

const PAYMENT_LABEL = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
};

const formatMoney = (value = 0) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;

export default function FeeCollectionPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeData, setFeeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthKey(new Date()));
  const [selectedClass, setSelectedClass] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [printQueue, setPrintQueue] = useState([]);
  const [showPrintQueue, setShowPrintQueue] = useState(false);
  const loadRequestRef = useRef(0);
  const toast = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadData();
    setSelectedIds([]);
  }, [selectedMonth, selectedClass]);

  const classFilterParams = useMemo(
    () => (selectedClass === 'all' ? {} : { class_id: selectedClass }),
    [selectedClass]
  );

  const loadInitialData = async () => {
    const classesRes = await classesService.getAll();
    if (classesRes.success) {
      setClasses(classesRes.data.classes || []);
    }
  };

  const loadData = async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    setLoading(true);
    const workbenchRes = await monthlyFeesService.getWorkbench({
      month: selectedMonth,
      limit: 500,
      ...classFilterParams,
    });

    if (workbenchRes.success) {
      if (!isCurrentRequest()) return;
      const feeMap = {};
      (workbenchRes.data.fees || []).forEach((fee) => {
        feeMap[fee.student_id] = fee;
      });
      setStudents(workbenchRes.data.students || []);
      setFeeData(feeMap);
      setLoading(false);
      return;
    }

    const [studentsRes, feesRes] = await Promise.all([
      studentsService.getAll({ status: 'active', limit: 500, ...classFilterParams }),
      monthlyFeesService.getAll({ month: selectedMonth, ...classFilterParams }),
    ]);

    if (!isCurrentRequest()) return;

    if (studentsRes.success) {
      setStudents(studentsRes.data.students || []);
    } else {
      toast.error(studentsRes.error?.message || 'Không thể tải học viên');
    }

    if (feesRes.success) {
      const feeMap = {};
      (feesRes.data.fees || []).forEach((fee) => {
        feeMap[fee.student_id] = fee;
      });
      setFeeData(feeMap);
    } else {
      toast.error(feesRes.error?.message || 'Không thể tải học phí');
    }

    setLoading(false);
  };

  const studentFees = useMemo(() => {
    return students.map((student) => {
      const fee = feeData[student.id];
      return {
        ...student,
        fee,
        attendanceSummary: fee ? `${fee.total_days || 0} buổi` : 'Chưa tính',
        feeAmount: fee?.total_amount || 0,
        feeStatus: fee?.status || 'pending',
      };
    });
  }, [students, feeData]);

  const filteredStudents = useMemo(() => {
    if (statusFilter === 'all') return studentFees;
    return studentFees.filter((student) => student.feeStatus === statusFilter);
  }, [studentFees, statusFilter]);

  const selectedRows = useMemo(
    () => filteredStudents.filter((student) => selectedIds.includes(student.id)),
    [filteredStudents, selectedIds]
  );

  const payableRows = useMemo(
    () =>
      selectedRows.filter(
        (student) => student.feeStatus !== 'paid' && !student.fee?.needs_admin_review
      ),
    [selectedRows]
  );

  const summary = useMemo(() => {
    const total = studentFees.length;
    const pending = studentFees.filter((student) => student.feeStatus === 'pending').length;
    const ready = studentFees.filter((student) => student.feeStatus === 'ready').length;
    const confirmed = studentFees.filter((student) => student.feeStatus === 'confirmed').length;
    const paid = studentFees.filter((student) => student.feeStatus === 'paid').length;
    const totalAmount = studentFees.reduce((sum, student) => sum + (student.feeAmount || 0), 0);
    const paidAmount = studentFees
      .filter((student) => student.feeStatus === 'paid')
      .reduce((sum, student) => sum + (student.feeAmount || 0), 0);
    const selectedAmount = payableRows.reduce((sum, student) => sum + (student.feeAmount || 0), 0);

    return { total, pending, ready, confirmed, paid, totalAmount, paidAmount, selectedAmount };
  }, [studentFees, payableRows]);
  const initialLoading = loading && studentFees.length === 0;
  const displayMetric = (value) => (initialLoading ? "..." : value);

  const navigateMonth = (delta) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(toMonthKey(date));
  };

  const handleCalculateFee = async (studentId) => {
    const res = await monthlyFeesService.calculate(studentId, selectedMonth);
    if (res.success) {
      toast.success('Đã tính học phí');
      await loadData();
    } else {
      toast.error(res.error?.message || 'Không thể tính học phí');
    }
  };

  const handleCalculateSelected = async () => {
    const rows = selectedRows.filter(
      (student) => student.feeStatus !== 'paid' && !student.fee?.needs_admin_review
    );
    if (!rows.length) {
      toast.error('Chọn ít nhất một học viên chưa thu');
      return;
    }

    setProcessing(true);
    const results = await Promise.all(
      rows.map((student) => monthlyFeesService.calculate(student.id, selectedMonth))
    );
    const failed = results.filter((result) => !result.success).length;
    toast.success(`Đã tính ${rows.length - failed}/${rows.length} học viên`);
    if (failed) toast.error(`${failed} học viên không thể tính phí`);
    await loadData();
    setProcessing(false);
  };

  const collectRows = async (rows, method) => {
    const targetRows = rows.filter(
      (student) => student.feeStatus !== 'paid' && !student.fee?.needs_admin_review
    );
    if (!targetRows.length) {
      toast.error('Không có học viên cần thu trong lựa chọn hiện tại');
      return;
    }

    setProcessing(true);
    const res = await monthlyFeesService.bulkPay({
      month: selectedMonth,
      student_ids: targetRows.map((student) => student.id),
      payment_method: method,
    });

    if (res.success) {
      const receipts = (res.data.results || []).filter((item) => item.receipt_id);
      setPrintQueue(receipts);
      setShowPrintQueue(receipts.length > 0);
      toast.success(
        `Đã thu ${res.data.paid || 0} học viên bằng ${PAYMENT_LABEL[method]}`
      );
      if (res.data.failed) {
        toast.error(`${res.data.failed} dòng không thu được, xem lại dữ liệu điểm danh/học phí`);
      }
      await loadData();
      setSelectedIds([]);
      setShowPayModal(false);
      setSelectedStudent(null);
    } else {
      toast.error(res.error?.message || 'Không thể thu tiền');
    }
    setProcessing(false);
  };

  const handlePay = (student) => {
    setSelectedStudent(student);
    setPaymentMethod('cash');
    setShowPayModal(true);
  };

  const confirmPayment = async () => {
    if (!selectedStudent) return;
    await collectRows([selectedStudent], paymentMethod);
  };

  const handlePrintReceipt = async (receiptId) => {
    try {
      await openAuthenticatedPdf(`/api/receipts/${receiptId}/pdf`);
    } catch (error) {
      toast.error(error?.message || 'Không thể tạo PDF. Vui lòng thử lại.');
    }
  };

  const handlePrintStudent = async (student) => {
    if (!student.fee?.receipt_id) {
      toast.error('Chưa có phiếu thu');
      return;
    }
    await handlePrintReceipt(student.fee.receipt_id);
  };

  const handlePrintAll = async () => {
    for (const item of printQueue) {
      await handlePrintReceipt(item.receipt_id);
    }
  };

  const columns = [
    {
      key: 'full_name',
      title: 'Học viên',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-sm font-bold text-primary-700">
            {value?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{row.parent_name || row.parent_phone || row.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class_names',
      title: 'Lớp học',
      render: (value) =>
        value ? (
          <div className="flex flex-wrap gap-1">
            {value.split(', ').map((className) => (
              <span key={className} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {className}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'attendanceSummary',
      title: 'Số buổi',
      render: (value) => <span className="font-mono text-slate-700">{value}</span>,
    },
    {
      key: 'feeAmount',
      title: 'Số tiền',
      render: (value, row) => (
        <div>
          <span className="font-bold text-emerald-700">
            {value > 0 ? formatMoney(value) : row.fee ? '0đ' : 'Chưa tính'}
          </span>
          {row.fee?.receipt_id ? (
            <p className="text-[11px] text-slate-400">Phiếu: {row.fee.receipt_id}</p>
          ) : null}
          {row.fee?.needs_admin_review ? (
            <p className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              Cần admin đối soát
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'feeStatus',
      title: 'Trạng thái',
      render: (value) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${FEE_STATUS[value]?.color}`}>
          {FEE_STATUS[value]?.icon} {FEE_STATUS[value]?.label}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      sortable: false,
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          {row.feeStatus === 'pending' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCalculateFee(row.id);
              }}
              className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              Tính phí
            </button>
          )}
          {row.feeStatus !== 'paid' && !row.fee?.needs_admin_review && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePay(row);
              }}
              className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200"
            >
              Thu tiền
            </button>
          )}
          {row.fee?.needs_admin_review && (
            <span className="rounded-xl bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              Khóa thu
            </span>
          )}
          {row.feeStatus === 'paid' && row.fee?.receipt_id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrintStudent(row);
              }}
              className="rounded-xl bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-200"
            >
              In lại
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-primary-500">
            Tài chính · Fee Workbench
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            Thu tiền học phí
          </h1>
          <p className="text-slate-500">
            Lọc theo lớp/tháng, tick nhiều học viên và thu một lần như bảng vận hành.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={processing || !payableRows.length}
            onClick={handleCalculateSelected}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 disabled:opacity-50"
          >
            <Calculator size={16} /> Tính dòng chọn
          </button>
          <button
            type="button"
            disabled={processing || !payableRows.length}
            onClick={() => collectRows(payableRows, 'cash')}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Banknote size={16} /> Thu tiền mặt
          </button>
          <button
            type="button"
            disabled={processing || !payableRows.length}
            onClick={() => collectRows(payableRows, 'transfer')}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            <CreditCard size={16} /> Thu chuyển khoản
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div className="rounded-3xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Tháng
              </label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigateMonth(-1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-600">←</button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="input flex-1"
                />
                <button type="button" onClick={() => navigateMonth(1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-600">→</button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Lớp
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="input"
              >
                <option value="all">Tất cả lớp</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.class_name || classItem.className}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-primary-50 p-3 text-sm text-primary-700">
            Đã chọn <b>{selectedRows.length}</b> học viên · Chờ thu <b>{payableRows.length}</b> · Ước tính{' '}
            <b>{formatMoney(summary.selectedAmount)}</b>
          </div>
        </div>

        {[
          { label: 'Tổng học viên', value: displayMetric(summary.total), tone: 'slate', icon: Wallet },
          { label: 'Chờ thu', value: displayMetric(summary.pending + summary.ready + summary.confirmed), tone: 'amber', icon: Calculator },
          { label: 'Đã thu', value: displayMetric(summary.paid), tone: 'emerald', icon: CheckCircle2 },
          { label: 'Dòng tiền', value: displayMetric(formatMoney(summary.paidAmount)), sub: initialLoading ? 'Đang tải dữ liệu' : `/ ${formatMoney(summary.totalAmount)}`, tone: 'primary', icon: Banknote },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-3xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
                <div className="rounded-2xl bg-slate-100 p-2 text-slate-500">
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">{metric.value}</p>
              {metric.sub ? <p className="text-xs font-semibold text-slate-500">{metric.sub}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Tất cả', count: summary.total },
          { key: 'pending', label: 'Chờ chốt', count: summary.pending },
          { key: 'ready', label: 'Sẵn sàng', count: summary.ready },
          { key: 'confirmed', label: 'Đã xác nhận', count: summary.confirmed },
          { key: 'paid', label: 'Đã thu', count: summary.paid },
        ].map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => {
              setStatusFilter(filter.key);
              setSelectedIds([]);
            }}
            className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
              statusFilter === filter.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary-700'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredStudents}
        loading={initialLoading}
        emptyMessage="Không có học viên nào"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(row) => row.id}
        searchKeys={["full_name", "parent_name", "parent_phone", "class_names", "feeStatus", "attendanceSummary"]}
      />

      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Xác nhận thu tiền"
        size="md"
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-slate-600">Học viên:</span>
                <span className="font-bold">{selectedStudent.full_name}</span>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-slate-600">Tháng:</span>
                <span className="font-bold">{selectedMonth}</span>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-slate-600">Số buổi:</span>
                <span className="font-bold">{selectedStudent.fee?.total_days || 0}</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-bold">Số tiền:</span>
                <span className="font-black text-emerald-600">
                  {formatMoney(selectedStudent.feeAmount)}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Hình thức thanh toán
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'cash', label: 'Tiền mặt', icon: Banknote },
                  { key: 'transfer', label: 'Chuyển khoản', icon: CreditCard },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPaymentMethod(item.key)}
                      className={`rounded-2xl border-2 p-4 font-bold transition ${
                        paymentMethod === item.key
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="mx-auto mb-2" size={22} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 pt-4 backdrop-blur md:-mx-8 md:px-8">
              <button type="button" onClick={() => setShowPayModal(false)} className="btn-secondary">
                Hủy
              </button>
              <button type="button" onClick={confirmPayment} disabled={processing} className="btn-primary">
                {processing ? 'Đang xử lý...' : 'Xác nhận thu tiền'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showPrintQueue}
        onClose={() => setShowPrintQueue(false)}
        title="In phiếu thu"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Đã tạo {printQueue.length} phiếu thu. Có thể in toàn bộ hoặc từng phiếu.
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {printQueue.map((item) => (
              <div key={item.receipt_id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3">
                <div>
                  <p className="font-bold text-slate-900">{item.student_id}</p>
                  <p className="text-xs text-slate-500">
                    {item.total_days} buổi · {formatMoney(item.total_amount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(item.receipt_id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-2 text-sm font-bold text-blue-700"
                >
                  <Printer size={16} /> In
                </button>
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 pt-4 backdrop-blur md:-mx-8 md:px-8">
            <button type="button" onClick={() => setShowPrintQueue(false)} className="btn-secondary">
              Đóng
            </button>
            <button type="button" onClick={handlePrintAll} className="btn-primary">
              In tất cả
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
