import { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Plus, Search, Trash2, Wallet,
  Lightbulb, Briefcase, FileText, ChevronRight, AlertCircle, Sparkles
} from 'lucide-react';
import { bulkActionsService, paymentsService, teachersService } from '../services/api';
import BulkActionBar from '../components/ui/BulkActionBar';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { paymentFormSchema } from '../utils/formValidation';

// PREMIUM UI: Chi Tiền (MotionSites style)
export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    const response = await paymentsService.getAll();
    if (response.success) {
      setPayments(response.data.payments || []);
      const currentIds = new Set((response.data.payments || []).map((payment) => payment.id));
      setSelectedPaymentIds((ids) => ids.filter((id) => currentIds.has(id)));
    }
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!selectedPaymentIds.length) return;
    if (!window.confirm(`Xóa ${selectedPaymentIds.length} phiếu chi?`)) return;

    const response = await bulkActionsService.execute({
      resource: 'payments',
      action: 'delete',
      ids: selectedPaymentIds,
    });
    if (!response.success) {
      toast.error(response.error?.message || 'Xóa hàng loạt thất bại');
      return;
    }

    const { requested, succeeded, failed } = response.data;
    if (failed) {
      toast.warning(`Đã xóa ${succeeded}/${requested}; lỗi ${failed}`);
    } else {
      toast.success(`Đã xóa thành công ${succeeded} phiếu chi`);
    }
    setSelectedPaymentIds([]);
    loadPayments();
  };

  const categoryLabels = {
    salary: { label: 'Lương giáo viên', icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-500/10' },
    utility: { label: 'Điện/Nước', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    office: { label: 'Văn phòng phẩm', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    other: { label: 'Khác', icon: Sparkles, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  };

  const filteredPayments = payments.filter(p =>
    p.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery)
  );

  const toggleSelect = (id) => {
    setSelectedPaymentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <Motion.section variants={itemVariants} className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-sky-900 p-6 text-white shadow-2xl shadow-sky-900/20 md:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 backdrop-blur">
              Financial Operations
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Chi Tiền
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                Quản lý và theo dõi các khoản chi tiêu của trung tâm, duy trì hồ sơ thanh toán minh bạch và hiệu quả.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="group inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 shadow-xl shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:bg-cyan-50"
          >
            <svg className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo phiếu chi mới
          </button>
        </div>
      </Motion.section>

      <BulkActionBar
        count={selectedPaymentIds.length}
        onClear={() => setSelectedPaymentIds([])}
        actions={[
          {
            label: 'Xóa phiếu đã chọn',
            className: 'bg-rose-100 text-rose-700 hover:bg-rose-200 font-semibold border-none',
            onClick: handleBulkDelete,
          },
        ]}
      />

      {/* Control Panel */}
      <Motion.section
        variants={itemVariants}
        className="flex gap-4 justify-between items-center bg-white/70 backdrop-blur-lg border border-slate-200/60 rounded-2xl p-2 shadow-sm"
      >
        <div className="relative group w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm phiếu chi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all"
          />
        </div>
      </Motion.section>

      {/* Modern Card List instead of basic table */}
      <Motion.section
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {loading ? (
            <div className="col-span-full flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search size={24} />
              </div>
              <p className="font-medium text-slate-500">Không tìm thấy phiếu chi nào</p>
            </div>
          ) : (
            filteredPayments.map((payment, index) => {
              const cat = categoryLabels[payment.category] || categoryLabels.other;
              const isSelected = selectedPaymentIds.includes(payment.id);

              return (
                <Motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
                  key={payment.id}
                  onClick={() => toggleSelect(payment.id)}
                  className={`relative cursor-pointer overflow-hidden rounded-2xl border transition-all ${
                    isSelected
                    ? 'border-orange-400 shadow-[0_8px_30px_rgb(249,115,22,0.15)] bg-orange-50/50'
                    : 'border-slate-200/60 bg-white/80 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
                  } backdrop-blur-xl p-5 group`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <div className={`p-2.5 rounded-xl ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform duration-300`}>
                        <cat.icon size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">#{payment.id}</p>
                        <p className={`text-sm font-semibold ${cat.color}`}>{cat.label}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5 stroke-white stroke-[2]"><path d="M3 7.5L5.5 10L11 4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{payment.recipient_name}</h3>
                    {payment.recipient_phone && (
                      <p className="text-sm font-medium text-slate-500">{payment.recipient_phone}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 pt-4 mt-auto">
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-1">Số tiền chi</p>
                      <p className="text-xl font-black text-rose-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount || 0)}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                      {new Date(payment.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>

                  {payment.notes && (
                    <div className="mt-3 text-sm text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                      <span className="font-medium mr-1 text-slate-700">Ghi chú:</span>
                      {payment.notes}
                    </div>
                  )}
                </Motion.div>
              );
            })
          )}
        </AnimatePresence>
      </Motion.section>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={
          <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Plus size={24} className="text-orange-500" />
            Tạo phiếu chi mới
          </div>
        }
        size="lg"
      >
        <PaymentForm
          onSuccess={() => { setShowForm(false); loadPayments(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </Motion.div>
  );
}

function PaymentForm({ onSuccess, onCancel }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit: handleValidatedSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      category: 'other',
      amount: 0,
      recipient_name: '',
      recipient_phone: '',
      notes: '',
    },
  });
  const formData = watch();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    const response = await teachersService.getAll();
    if (response.success) {
      setTeachers(response.data.teachers || []);
    }
  };

  const handleCategoryChange = (category) => {
    setValue('category', category, { shouldDirty: true, shouldValidate: true });
  };

  const handleTeacherSelect = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      setValue('recipient_name', teacher.full_name || '', { shouldDirty: true, shouldValidate: true });
      setValue('recipient_phone', teacher.phone || '', { shouldDirty: true });
      setValue('amount', teacher.salary_amount || 0, { shouldDirty: true, shouldValidate: true });
    }
  };

  const handleSubmit = async (values) => {
    if (!formData.recipient_name) return setError('Vui lòng nhập tên người nhận');
    if (!formData.amount || formData.amount <= 0) return setError('Vui lòng nhập số tiền hợp lệ');

    setLoading(true);
    setError('');

    const response = await paymentsService.create({
      ...values,
      template_id: 'TPL_DEFAULT_PAYMENT',
    });

    if (response.success) {
      onSuccess();
    } else {
      setError(response.error?.message || 'Không thể tạo phiếu chi');
    }
    setLoading(false);
  };

  const categories = [
    { value: 'salary', label: 'Lương GV', icon: Briefcase, color: 'text-violet-600', activeBg: 'bg-violet-50 border-violet-500' },
    { value: 'utility', label: 'Điện/Nước', icon: Lightbulb, color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-500' },
    { value: 'office', label: 'VP phẩm', icon: FileText, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-500' },
    { value: 'other', label: 'Khác', icon: Sparkles, color: 'text-rose-600', activeBg: 'bg-rose-50 border-rose-500' },
  ];

  return (
    <form onSubmit={handleValidatedSubmit(handleSubmit)} className="space-y-6 pt-2">
      <AnimatePresence>
        {(error || Object.keys(errors).length > 0) && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-rose-700"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="font-medium text-sm">{error || Object.values(errors)[0]?.message}</p>
          </Motion.div>
        )}
      </AnimatePresence>

      <input type="hidden" {...register('category')} />

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-3">Loại phiếu chi</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map(cat => {
            const isActive = formData.category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleCategoryChange(cat.value)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                  isActive
                    ? `${cat.activeBg} shadow-sm scale-[1.02]`
                    : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                }`}
              >
                <cat.icon size={24} className={isActive ? cat.color : ''} />
                <p className={`mt-2 text-sm font-bold ${isActive ? cat.color : ''}`}>{cat.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {formData.category === 'salary' && teachers.length > 0 && (
        <Motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <label className="block text-sm font-bold text-slate-700 mb-2">Chọn nhanh giáo viên</label>
          <div className="relative">
            <select
              onChange={(e) => handleTeacherSelect(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
            >
              <option value="">-- Click để chọn giáo viên --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name} - {t.salary_amount?.toLocaleString()}đ</option>
              ))}
            </select>
            <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
          </div>
        </Motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Người nhận <span className="text-rose-500">*</span></label>
          <input
            type="text"
            {...register('recipient_name')}
            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            placeholder="Tên cá nhân/tổ chức..."
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Số điện thoại</label>
          <input
            type="tel"
            {...register('recipient_phone')}
            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
            placeholder="09x xxx xxxx"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Số tiền chi (VNĐ) <span className="text-rose-500">*</span></label>
        <div className="relative">
          <input
            type="number"
            {...register('amount', { valueAsNumber: true })}
            className="w-full bg-white border border-slate-200 text-rose-600 font-black text-2xl rounded-xl pl-4 pr-16 py-4 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-inner"
            min="0"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase tracking-widest">VNĐ</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-500 flex items-center gap-2">
          <ArrowDownRight size={14} className="text-rose-500" />
          Số tiền thực tế: <span className="text-rose-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.amount || 0)}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Lý do / Ghi chú chi tiết</label>
        <textarea
          {...register('notes')}
          className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
          rows={3}
          placeholder="Mô tả rõ lý do chi tiền..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-500 shadow-lg shadow-orange-500/25 rounded-xl text-white font-bold hover:shadow-orange-500/40 transition-all disabled:opacity-50 active:scale-95"
        >
          {loading ? 'Đang khởi tạo...' : 'Xác nhận tạo phiếu'}
        </button>
      </div>
    </form>
  );
}
