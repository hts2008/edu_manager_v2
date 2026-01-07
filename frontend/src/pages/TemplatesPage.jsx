import { useState, useEffect } from 'react';
import { templatesService } from '../services/api';
import Modal, { ConfirmModal } from '../components/ui/Modal';

// VI: Trang quản lý mẫu in phiếu thu/chi
export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, receipt, payment
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  const loadTemplates = async () => {
    setLoading(true);
    const type = filter === 'all' ? null : filter;
    const response = await templatesService.getAll(type);
    if (response.success) {
      setTemplates(response.data.templates || []);
    }
    setLoading(false);
  };

  const handleSetDefault = async (id) => {
    await templatesService.setDefault(id);
    loadTemplates();
  };

  const handleDelete = async () => {
    if (selectedTemplate) {
      await templatesService.delete(selectedTemplate.id);
      loadTemplates();
      setSelectedTemplate(null);
    }
  };

  const typeLabels = {
    receipt: { label: 'Phiếu thu', color: 'bg-green-100 text-green-700' },
    payment: { label: 'Phiếu chi', color: 'bg-red-100 text-red-700' },
  };

  const paperSizeLabels = {
    a4: 'A4',
    a5: 'A5',
    letter: 'Letter',
    thermal_80mm: 'Thermal 80mm',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý mẫu in</h1>
          <p className="text-gray-500">Tạo và chỉnh sửa mẫu phiếu thu, phiếu chi</p>
        </div>
        <button 
          onClick={() => { setEditingTemplate(null); setShowForm(true); }} 
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo mẫu mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
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

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div 
              key={template.id} 
              className={`card p-4 hover:shadow-lg transition-shadow ${
                template.is_default ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              {/* Preview Thumbnail */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg h-40 mb-4 flex items-center justify-center border border-gray-200">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {template.type === 'receipt' ? '📄' : '📋'}
                  </div>
                  <p className="text-sm text-gray-500">{paperSizeLabels[template.paper_size]}</p>
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
                    {template.is_default === 1 && (
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
                  className="flex-1 py-2 text-sm font-medium text-center text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  🎨 Thiết kế
                </a>
                <button
                  onClick={() => { setEditingTemplate(template); setShowForm(true); }}
                  className="py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✏️
                </button>
                {!template.is_default && (
                  <button
                    onClick={() => handleSetDefault(template.id)}
                    className="py-2 px-3 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    ⭐
                  </button>
                )}
                <button
                  onClick={() => { setSelectedTemplate(template); setShowDeleteConfirm(true); }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
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

    const response = template
      ? await templatesService.update(template.id, formData)
      : await templatesService.create(formData);

    if (response.success) {
      onSuccess();
    } else {
      setError(response.error?.message || 'Có lỗi xảy ra');
    }
    setLoading(false);
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
