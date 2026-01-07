import { useState, useEffect } from 'react';
import { receiptsService, paymentsService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { exportTransactions } from '../utils/excelExport';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

// VI: Trang lịch sử giao dịch thu/chi
export default function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, receipts, payments
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTransactions();
  }, [filter, dateRange]);

  const loadTransactions = async () => {
    setLoading(true);
    
    let allTransactions = [];
    
    if (filter === 'all' || filter === 'receipts') {
      const receiptsRes = await receiptsService.getAll();
      if (receiptsRes.success) {
        const receipts = (receiptsRes.data.receipts || []).map(r => ({
          ...r,
          type: 'receipt',
          description: `Thu học phí - ${r.student_name || 'Học viên'}`,
        }));
        allTransactions = [...allTransactions, ...receipts];
      }
    }
    
    if (filter === 'all' || filter === 'payments') {
      const paymentsRes = await paymentsService.getAll();
      if (paymentsRes.success) {
        const payments = (paymentsRes.data.payments || []).map(p => ({
          ...p,
          type: 'payment',
          description: `Chi - ${p.recipient_name || 'Người nhận'}`,
        }));
        allTransactions = [...allTransactions, ...payments];
      }
    }
    
    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    setTransactions(allTransactions);
    setLoading(false);
  };

  const totalReceipts = transactions
    .filter(t => t.type === 'receipt')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const totalPayments = transactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const balance = totalReceipts - totalPayments;

  const formatCurrency = (value) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  const columns = [
    {
      key: 'created_at',
      title: 'Ngày',
      render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-',
    },
    {
      key: 'id',
      title: 'Mã giao dịch',
      render: (value, row) => (
        <span className={`font-mono text-sm ${row.type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'type',
      title: 'Loại',
      render: (value) => (
        <span className={value === 'receipt' ? 'badge-success' : 'badge-error'}>
          {value === 'receipt' ? 'Thu' : 'Chi'}
        </span>
      ),
    },
    {
      key: 'description',
      title: 'Mô tả',
      render: (value) => (
        <span className="text-gray-900">{value}</span>
      ),
    },
    {
      key: 'amount',
      title: 'Số tiền',
      render: (value, row) => (
        <span className={`font-semibold ${row.type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
          {row.type === 'receipt' ? '+' : '-'}{formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => handlePrintPdf(row)}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="In phiếu"
          >
            🖨️
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setDeleteModal({ open: true, item: row })}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Xóa"
            >
              🗑️
            </button>
          )}
        </div>
      ),
    },
  ];

  const handlePrintPdf = (transaction) => {
    const endpoint = transaction.type === 'receipt' 
      ? `/api/receipts/${transaction.id}/pdf`
      : `/api/payments/${transaction.id}/pdf`;
    
    const token = localStorage.getItem('token');
    fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch(() => {
        toast.error('Không thể tạo PDF. Vui lòng thử lại.');
      });
  };

  const handleDelete = async () => {
    const item = deleteModal.item;
    if (!item) return;
    
    const service = item.type === 'receipt' ? receiptsService : paymentsService;
    const res = await service.delete(item.id);
    
    if (res.success) {
      toast.success(`Đã xóa ${item.type === 'receipt' ? 'phiếu thu' : 'phiếu chi'} ${item.id}`);
      loadTransactions();
    } else {
      toast.error(res.error?.message || 'Không thể xóa');
    }
    setDeleteModal({ open: false, item: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử giao dịch</h1>
          <p className="text-gray-500">Theo dõi các khoản thu/chi của trung tâm</p>
        </div>
        <button
          onClick={() => exportTransactions(transactions)}
          disabled={transactions.length === 0}
          className="btn-secondary"
        >
          📄 Xuất Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card bg-green-50 border-green-200">
          <div className="card-body">
            <p className="text-sm text-green-700">Tổng thu</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceipts)}</p>
          </div>
        </div>
        <div className="card bg-red-50 border-red-200">
          <div className="card-body">
            <p className="text-sm text-red-700">Tổng chi</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPayments)}</p>
          </div>
        </div>
        <div className={`card ${balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="card-body">
            <p className={`text-sm ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Cân đối</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Tất cả' },
                { value: 'receipts', label: 'Chỉ Thu' },
                { value: 'payments', label: 'Chỉ Chi' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === opt.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center ml-auto">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="input w-auto"
              />
              <span className="text-gray-500">→</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="input w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        emptyMessage="Chưa có giao dịch nào"
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        title="Xác nhận xóa"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Bạn có chắc muốn xóa {deleteModal.item?.type === 'receipt' ? 'phiếu thu' : 'phiếu chi'}{' '}
            <strong>{deleteModal.item?.id}</strong>?
          </p>
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            ⚠️ Hành động này không thể hoàn tác!
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModal({ open: false, item: null })}
              className="btn-secondary"
            >
              Hủy
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Xóa
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
