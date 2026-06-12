import { useState, useEffect } from 'react';
import { FileText, Palette, Plus, Star, Trash2 } from 'lucide-react';
import { templatesService } from '../services/api';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import ActionProgressButton from '../components/ui/ActionProgressButton';
import LoadingScene from '../components/ui/LoadingScene';
import PageState from '../components/ui/PageState';
import { ListPanel, MetricGrid, OperationalPage, PageIntro } from '../components/ui/OperationalPage';

// VI: Trang quản lý mẫu in phiếu thu/chi
export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, receipt, payment
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    const type = filter === 'all' ? null : filter;
    try {
      const response = await templatesService.getAll(type);
      if (response.success) {
        setTemplates(response.data.templates || []);
      } else {
        setError(response.error?.message || 'Không tải được danh sách mẫu in');
      }
    } catch (loadError) {
      setError(loadError?.message || 'Không tải được danh sách mẫu in');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    setActionBusy(`default:${id}`);
    setError('');
    try {
      const response = await templatesService.setDefault(id);
      if (!response.success) {
        setError(response.error?.message || 'Không đặt được mẫu mặc định');
        return;
      }
      await loadTemplates();
    } finally {
      setActionBusy(null);
    }
  };

  const handleDelete = async () => {
    if (selectedTemplate) {
      setActionBusy(`delete:${selectedTemplate.id}`);
      setError('');
      try {
        const response = await templatesService.delete(selectedTemplate.id);
        if (!response.success) {
          setError(response.error?.message || 'Không xóa được mẫu in');
          return;
        }
        await loadTemplates();
        setSelectedTemplate(null);
        setShowDeleteConfirm(false);
      } finally {
        setActionBusy(null);
      }
    }
  };

  const typeLabels = {
    receipt: { label: 'Phiếu thu', color: 'bg-green-100 text-green-700' },
    payment: { label: 'Phiếu chi', color: 'bg-red-100 text-red-700' },
  };

  const paperSizeLabels = {
    a4: 'A4',
    a5: 'A5',
    a6: 'A6',
    letter: 'Letter',
    thermal_80mm: 'Thermal 80mm',
  };

  const readTemplateConfig = (template) => {
    const raw = template?.json_config;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const getPaperLabel = (template) => {
    const paper = readTemplateConfig(template).paper;
    if (paper?.label) return paper.label;
    if (paper?.mode === 'custom' || paper?.width_mm || paper?.height_mm) {
      const width = paper?.width_mm || paper?.width || '?';
      const height = paper?.height_mm || paper?.height || '?';
      return `${width} x ${height} mm`;
    }
    return paperSizeLabels[template.paper_size] || template.paper_size || 'A4';
  };

  const isDefaultTemplate = (template) => template.is_default === true || template.is_default === 1;

  const metrics = [
    { label: 'Tổng mẫu', value: templates.length, helper: 'Đang quản lý', icon: FileText, tone: 'indigo' },
    { label: 'Phiếu thu', value: templates.filter((item) => item.type === 'receipt').length, helper: 'Mẫu thu tiền', icon: FileText, tone: 'emerald' },
    { label: 'Phiếu chi', value: templates.filter((item) => item.type === 'payment').length, helper: 'Mẫu chi tiền', icon: FileText, tone: 'rose' },
    { label: 'Mặc định', value: templates.filter(isDefaultTemplate).length, helper: 'Đang áp dụng', icon: Star, tone: 'amber' },
  ];

  return (
    <OperationalPage>
      <PageIntro
        eyebrow="Mẫu in"
        title="Quản lý mẫu in"
        description="Tạo, chỉnh sửa và chọn mẫu mặc định cho phiếu thu, phiếu chi. Trình thiết kế giữ nguyên canvas khi upload/lưu để người dùng luôn thấy hệ thống đang xử lý."
        status={loading ? 'Đang tải' : 'Sẵn sàng'}
        actions={
          <button
            onClick={() => { setEditingTemplate(null); setShowForm(true); }}
            className="btn-primary"
          >
            <Plus size={18} aria-hidden="true" />
            Tạo mẫu mới
          </button>
        }
      />

      <MetricGrid metrics={metrics} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Tất cả' },
          { value: 'receipt', label: 'Phiếu thu' },
          { value: 'payment', label: 'Phiếu chi' },
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

      {error && (
        <PageState
          title="Không tải được mẫu in"
          message={error}
          tone="red"
          action={loadTemplates}
          actionLabel="Tải lại"
        />
      )}

      {/* Templates Grid */}
      {loading ? (
        <LoadingScene
          label="Đang tải thư viện mẫu in..."
          detail="Hệ thống đang đọc metadata, mẫu mặc định và cấu hình khổ giấy."
        />
      ) : !error && templates.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có mẫu nào</h3>
          <p className="text-gray-500 mb-4">Tạo mẫu phiếu đầu tiên để bắt đầu in ấn</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Tạo mẫu mới
          </button>
        </div>
      ) : !error ? (
        <ListPanel
          title="Thư viện mẫu"
          description="Mỗi mẫu có thể mở vào trình thiết kế canvas để chỉnh ảnh, field động, khổ giấy và layer."
          countLabel={`${templates.length} mẫu`}
        >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div 
              key={template.id} 
              className={`card p-4 hover:shadow-lg transition-shadow ${
                isDefaultTemplate(template) ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              {/* Preview Thumbnail */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg h-40 mb-4 flex items-center justify-center border border-gray-200">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {template.type === 'receipt' ? '📄' : '📋'}
                  </div>
                  <p className="text-sm text-gray-500">{getPaperLabel(template)}</p>
                  <p className="text-xs text-gray-400">{template.orientation}</p>
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.template_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeLabels[template.type]?.color}`}>
                      {typeLabels[template.type]?.label}
                    </span>
                    {isDefaultTemplate(template) && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
                        Mặc định
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t">
                <a
                  href={`/templates/${template.id}/design`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                >
                  <Palette size={16} aria-hidden="true" />
                  Thiết kế
                </a>
                <button
                  onClick={() => { setEditingTemplate(template); setShowForm(true); }}
                  aria-label={`Sua mau ${template.template_name}`}
                  title={`Sua mau ${template.template_name}`}
                  className="py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✏️
                </button>
                {!isDefaultTemplate(template) && (
                  <ActionProgressButton
                    onClick={() => handleSetDefault(template.id)}
                    loading={actionBusy === `default:${template.id}`}
                    aria-label={`Dat ${template.template_name} lam mau mac dinh`}
                    title={`Dat ${template.template_name} lam mau mac dinh`}
                    className="py-2 px-3 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    loadingLabel="..."
                  >
                    <Star size={16} aria-hidden="true" />
                  </ActionProgressButton>
                )}
                <button
                  onClick={() => { setSelectedTemplate(template); setShowDeleteConfirm(true); }}
                  aria-label={`Xoa mau ${template.template_name}`}
                  title={`Xoa mau ${template.template_name}`}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
        </ListPanel>
      ) : null}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingTemplate ? 'Chỉnh sửa mẫu' : 'Tạo mẫu mới'}
        size="lg"
      >
        <TemplateForm
          template={editingTemplate}
          onSuccess={() => { setShowForm(false); loadTemplates(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xóa mẫu"
        message={`Bạn có chắc muốn xóa mẫu "${selectedTemplate?.template_name}"?`}
      />
    </OperationalPage>
  );
}

function TemplateForm({ template, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    type: template?.type || 'receipt',
    paper_size: template?.paper_size || 'a4',
    orientation: template?.orientation || 'portrait',
    json_config: template?.json_config || '{}',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.template_name.trim()) {
      setError('Vui lòng nhập tên mẫu');
      return;
    }

    setLoading(true);
    setError('');

    const payload = template
      ? {
          template_name: formData.template_name,
          type: formData.type,
          paper_size: formData.paper_size,
          orientation: formData.orientation,
        }
      : formData;

    try {
      const response = template
        ? await templatesService.update(template.id, payload)
        : await templatesService.create(payload);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error?.message || 'Có lỗi xảy ra');
      }
    } catch (submitError) {
      setError(submitError?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tên mẫu *</label>
        <input
          type="text"
          value={formData.template_name}
          onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
          className="input"
          placeholder="VD: Phiếu thu A4 cơ bản"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Loại phiếu</label>
          <div className="flex gap-2">
            {[
              { value: 'receipt', label: 'Phiếu thu', icon: '💰' },
              { value: 'payment', label: 'Phiếu chi', icon: '📤' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormData({ ...formData, type: opt.value })}
                className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                  formData.type === opt.value
                    ? opt.value === 'receipt' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <p className="mt-1 text-sm font-medium">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Khổ giấy</label>
          <select
            value={formData.paper_size}
            onChange={(e) => setFormData({ ...formData, paper_size: e.target.value })}
            className="input"
          >
            <option value="a4">A4 (210 × 297 mm)</option>
            <option value="a5">A5 (148 × 210 mm)</option>
            <option value="a6">A6 (105 × 148 mm)</option>
            <option value="letter">Letter (216 × 279 mm)</option>
            <option value="thermal_80mm">Thermal (80mm)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hướng giấy</label>
        <div className="flex gap-2">
          {[
            { value: 'portrait', label: 'Dọc', icon: '📄' },
            { value: 'landscape', label: 'Ngang', icon: '📃' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFormData({ ...formData, orientation: opt.value })}
              className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                formData.orientation === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <p className="mt-1 text-sm font-medium">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-600 text-center">
          💡 Sau khi tạo mẫu, bạn có thể mở <strong>Trình thiết kế</strong> để thêm các phần tử như logo, text, bảng, v.v.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="btn-secondary">Hủy</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Đang lưu...' : template ? 'Cập nhật' : 'Tạo mẫu'}
        </button>
      </div>
    </form>
  );
}
