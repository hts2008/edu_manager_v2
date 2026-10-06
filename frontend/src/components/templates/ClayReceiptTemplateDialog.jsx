import { useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import Modal from '../ui/Modal';
import { templatesService } from '../../services/api';
import { CLAY_RECEIPT_DEFAULTS, readClayReceiptOptions, createClayReceiptLayout,
  renderClayReceiptBackground, renderClayReceiptPreview, buildClayReceiptPayload } from './clayReceiptTemplate';

export default function ClayReceiptTemplateDialog({ template = null, initialPaper = 'a4', onClose, onSaved }) {
  const original = readClayReceiptOptions(template);
  const [options, setOptions] = useState(() => ({ ...CLAY_RECEIPT_DEFAULTS,
    paper: initialPaper === 'a5' ? 'a5' : 'a4', ...original }));
  const [name, setName] = useState(template?.template_name || 'Phiếu thu Clay');
  const [artifact, setArtifact] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const canvasRef = useRef(null);
  const saveLock = useRef(false);
  const mounted = useRef(true);
  const saved = useRef(null);
  const initialTemplate = useRef(template);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const preview = document.createElement('canvas');
    setArtifact(null);
    setError('');
    const generate = async () => {
      try {
        await document.fonts?.ready;
        const layout = createClayReceiptLayout(options);
        const background = renderClayReceiptBackground(layout);
        await renderClayReceiptPreview(preview, layout, background);
        if (cancelled) return;
        const visible = canvasRef.current;
        if (!visible) return;
        visible.width = preview.width; visible.height = preview.height;
        visible.getContext('2d').drawImage(preview, 0, 0);
        setArtifact({ layout, background });
      } catch (failure) {
        if (!cancelled) setError(failure.message || 'Không thể tạo mẫu phiếu thu');
      }
    };
    generate();
    return () => { cancelled = true; };
  }, [options]);

  const change = (key, value) => {
    setArtifact(null); setDirty(true); setOptions(previous => ({ ...previous, [key]: value }));
  };
  const save = async () => {
    if (saveLock.current || !artifact || (template && !original) || template !== initialTemplate.current) return;
    saveLock.current = true; setSaving(true); setError('');
    try {
      const payload = buildClayReceiptPayload({ name, ...artifact });
      const response = (template?.id || saved.current?.id)
        ? await templatesService.update(template?.id || saved.current.id, payload)
        : await templatesService.create(payload);
      if (!response?.success) throw new Error(response?.error?.message || 'Không lưu được mẫu phiếu thu');
      saved.current = response.data;
      if (!mounted.current) return;
      setDirty(false);
      try { await onSaved?.(response.data); }
      catch { setError('Mẫu đã lưu. Không tải lại được danh sách mẫu.'); return; }
      if (mounted.current) onClose?.();
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'Không lưu được mẫu phiếu thu');
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const invalidTemplate = Boolean(template && !original) || template !== initialTemplate.current;
  return (
    <Modal isOpen onClose={onClose} title={template ? 'Chỉnh sửa phiếu thu Clay' : 'Tạo phiếu thu Clay'}
      size="xl" busy={saving} busyLabel="Đang lưu mẫu phiếu thu…" confirmOnClose hasUnsavedChanges={dirty}>
      <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <fieldset disabled={saving || invalidTemplate} className="min-w-0 space-y-4">
          <label className="block text-sm font-semibold">Tên mẫu
            <input className="input mt-1 w-full" value={name} maxLength={120} onChange={event => { setName(event.target.value); setDirty(true); }} />
          </label>
          <label className="block text-sm font-semibold">Khổ giấy
            <select aria-label="Khổ giấy" className="input mt-1 w-full" value={options.paper} onChange={event => change('paper', event.target.value)}>
              <option value="a4">A4 · Dọc</option><option value="a5">A5 · Dọc</option>
            </select>
          </label>
          {[
            ['centerName', 'Tên trung tâm', 100], ['contact', 'Địa chỉ / liên hệ', 180],
            ['heading', 'Tiêu đề phiếu', 80], ['footer', 'Lời cuối phiếu', 240],
          ].map(([key, label, maxLength]) => (
            <label key={key} className="block text-sm font-semibold">{label}
              <textarea rows={key === 'footer' ? 3 : 2} className="input mt-1 w-full resize-y" value={options[key]}
                maxLength={maxLength} onChange={event => change(key, event.target.value)} />
            </label>
          ))}
        </fieldset>
        <figure className="min-w-0">
          <figcaption className="mb-3 text-sm font-semibold">Xem trước · Dữ liệu minh họa</figcaption>
          <canvas ref={canvasRef} aria-label="Phiếu thu Clay với dữ liệu minh họa" role="img"
            className="block h-auto w-full border border-gray-200 shadow-lg" style={{ aspectRatio: options.paper === 'a5' ? '148 / 210' : '210 / 297' }} />
        </figure>
      </div>
      {(error || invalidTemplate) && <p role="alert" className="mt-4 text-sm text-rose-700">{invalidTemplate ? 'Chỉ chỉnh sửa mẫu Clay. Vui lòng mở lại mẫu.' : error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" data-modal-close disabled={saving} className="btn-secondary">Hủy</button>
        <button type="button" onClick={save} disabled={saving || !artifact || !name.trim() || invalidTemplate}
          className="btn-primary disabled:opacity-50"><Save size={18} aria-hidden="true" />{saving ? 'Đang lưu…' : 'Lưu mẫu'}</button>
      </div>
    </Modal>
  );
}
