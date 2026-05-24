import { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Search, SlidersHorizontal, Download, Printer, Trash2 } from 'lucide-react';
import { receiptsService, paymentsService } from '../services/api';
import Modal from '../components/ui/Modal';
import { exportTransactions } from '../utils/excelExport';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { openAuthenticatedPdf } from '../utils/pdfPrint';

// PREMIUM UI: Lịch sử giao dịch (MotionSites style)
export default function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [searchQuery, setSearchQuery] = useState("");
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

    allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setTransactions(allTransactions);
    setLoading(false);
  };

  const totalReceipts = transactions.filter(t => t.type === 'receipt').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPayments = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalReceipts - totalPayments;

  const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toString().includes(searchQuery)
  );

  const handlePrintPdf = async (transaction) => {
    const endpoint = transaction.type === 'receipt'
      ? `/api/receipts/${transaction.id}/pdf`
      : `/api/payments/${transaction.id}/pdf`;

    try {
      await openAuthenticatedPdf(endpoint);
    } catch (error) {
      toast.error(error?.message || 'Không thể tạo PDF. Vui lòng thử lại.');
    }
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
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <Motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Lịch sử giao dịch</h1>
          <p className="text-slate-500 font-medium">Theo dõi chi tiết mọi biến động số dư của trung tâm</p>
        </Motion.div>

        <Motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => exportTransactions(transactions)}
          disabled={transactions.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-700 font-semibold hover:border-slate-300 hover:shadow-md transition-all disabled:opacity-50"
        >
          <Download size={18} />
          Xuất báo cáo
        </Motion.button>
      </div>

      {/* Hero Stats Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Tổng Thu", value: totalReceipts, type: "receipt", icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-200/50" },
          { title: "Tổng Chi", value: totalPayments, type: "payment", icon: ArrowDownRight, color: "text-rose-600", bg: "bg-rose-500/10", border: "border-rose-200/50" },
          { title: "Cân đối", value: balance, type: "balance", icon: SlidersHorizontal, color: balance >= 0 ? "text-blue-600" : "text-amber-600", bg: balance >= 0 ? "bg-blue-500/10" : "bg-amber-500/10", border: balance >= 0 ? "border-blue-200/50" : "border-amber-200/50" },
        ].map((stat, idx) => (
          <Motion.div
            key={stat.title}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 + idx * 0.1 }}
            className={`relative overflow-hidden rounded-3xl border ${stat.border} bg-white/60 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all`}
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${stat.bg} blur-2xl pointer-events-none`} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 font-semibold">{stat.title}</span>
              <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} strokeWidth={2.5} />
              </div>
            </div>
            <p className={`text-3xl font-black tracking-tight ${stat.color}`}>
              {formatCurrency(stat.value)}
            </p>
          </Motion.div>
        ))}
      </div>

      {/* Control Panel: Filters & Search */}
      <Motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white/70 backdrop-blur-lg border border-slate-200/60 rounded-2xl p-2 shadow-sm"
      >
        <div className="flex p-1 bg-slate-100/80 rounded-xl w-full lg:w-auto">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'receipts', label: 'Chỉ Thu' },
            { value: 'payments', label: 'Chỉ Chi' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex-1 lg:flex-none px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                filter === opt.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto px-2">
          <div className="relative group flex-1 sm:min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm giao dịch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 outline-none w-[110px]"
            />
            <span className="text-slate-300">→</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 outline-none w-[110px]"
            />
          </div>
        </div>
      </Motion.div>

      {/* Transactions List */}
      <Motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
      >
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search size={24} />
              </div>
              <p className="font-medium text-slate-500">Không tìm thấy giao dịch nào</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mã GD</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nội dung</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Số tiền</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((row, index) => (
                  <Motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    key={row.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        {row.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {new Date(row.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${row.type === 'receipt' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="font-semibold text-slate-800">{row.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold text-base ${row.type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {row.type === 'receipt' ? '+' : '-'}{formatCurrency(row.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePrintPdf(row)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="In phiếu"
                        >
                          <Printer size={18} />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => setDeleteModal({ open: true, item: row })}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </Motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Motion.div>

      {/* Elegant Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        title="Xác nhận xóa giao dịch"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-4 items-start">
            <div className="p-2 bg-white rounded-xl shadow-sm text-rose-500">
              <Trash2 size={24} />
            </div>
            <div>
              <p className="text-slate-800 font-semibold mb-1">
                Xóa vĩnh viễn {deleteModal.item?.type === 'receipt' ? 'phiếu thu' : 'phiếu chi'} <span className="font-mono text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">{deleteModal.item?.id}</span>?
              </p>
              <p className="text-sm text-rose-600/80">Hành động này không thể hoàn tác và sẽ ảnh hưởng đến báo cáo tài chính.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteModal({ open: false, item: null })}
              className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleDelete}
              className="px-5 py-2.5 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95"
            >
              Xóa giao dịch
            </button>
          </div>
        </div>
      </Modal>
    </Motion.div>
  );
}
