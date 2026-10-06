import { createElement, useState } from 'react';
import { FileText, Palette, Eye, History, Save, RotateCcw, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExperience } from '../context/ExperienceContext';
import useDraftNavigationGuard from '../hooks/useDraftNavigationGuard';
import SettingsHistoryModal from './SettingsHistoryModal';
import { UI_COPY_REGISTRY, UI_THEME_PRESETS, DEFAULT_UI_THEME, DEFAULT_UI_COPY, formatUiText, validateExperienceCopy, validateExperienceTheme } from '../../../lib/ui-experience';

export default function ExperiencePage() {
  const experience = useExperience();
  const { hasPermission } = useAuth();
  if (!hasPermission('console.experience.view')) return <p role="alert">Bạn không có quyền xem giao diện.</p>;
  if (experience.loading && experience.published.config_version === 0) return <p role="status">Đang tải</p>;
  return <ExperienceEditor key={experience.scope} experience={experience} canEdit={hasPermission('console.experience.edit')} />;
}
function ExperienceEditor({ experience, canEdit }) {
  const [draft, setDraft] = useState(() => ({ copy: { ...experience.published.copy }, theme: { ...experience.theme } }));
  const [base, setBase] = useState(experience.published.config_version);
  const [tab, setTab] = useState('copy');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [historyKey, setHistoryKey] = useState(null);
  const changed = JSON.stringify(draft) !== JSON.stringify({ copy: experience.published.copy, theme: experience.theme });
  const remoteChanged = base !== experience.published.config_version;
  useDraftNavigationGuard({ dirty: canEdit && changed, saving });
  let invalid = false;
  try { validateExperienceCopy(draft.copy); validateExperienceTheme(draft.theme); } catch { invalid = true; }
  async function publish() {
    setSaving(true); setMessage(null);
    try {
      const result = await experience.publish({ ...draft, expected_config_version: base });
      setDraft({ copy: { ...result.copy }, theme: { ...result.theme } }); setBase(result.config_version);
      setMessage('Đã xuất bản.');
    } catch (error) {
      setMessage(error.status === 409 || /CONFLICT|VERSION/i.test(error.code ?? '') ? DEFAULT_UI_COPY['error.conflict'] : DEFAULT_UI_COPY['error.commit_unknown']);
    } finally { setSaving(false); }
  }
  return <section className="experience-console" aria-label="Giao diện tổ chức">
    <header><h1>Giao diện tổ chức</h1><span>Version {experience.published.config_version}</span></header>
    {(message || experience.error) && <p role="status">{message || experience.error}</p>}
    <nav aria-label="Cấu hình giao diện">{[['copy', FileText, 'Nội dung'], ['theme', Palette, 'Giao diện'], ['preview', Eye, 'Xem trước'], ['history', History, 'Lịch sử']].map(([id, Icon, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{createElement(Icon, { size: 16 })}{label}</button>)}</nav>
    {tab === 'copy' && <div className="experience-fields">{UI_COPY_REGISTRY.map(item => <label key={item.key}><span>{item.protected && <Lock size={14} />}{item.key}</span><input aria-label={item.key} disabled={!canEdit || saving || item.protected} maxLength={item.maxLength} value={item.protected ? item.defaultVi : draft.copy[item.key] ?? item.defaultVi} onChange={event => setDraft(previous => ({ ...previous, copy: { ...previous.copy, [item.key]: event.target.value } }))} /></label>)}</div>}
    {tab === 'theme' && <div className="experience-theme-controls"><fieldset disabled={!canEdit || saving}><legend>Bảng màu</legend>{Object.entries(UI_THEME_PRESETS).map(([preset]) => <label key={preset} className="experience-swatch" data-experience-theme={preset}><input type="radio" name="preset" checked={draft.theme.preset === preset} onChange={() => setDraft(previous => ({ ...previous, theme: { ...previous.theme, preset } }))} /><span className="experience-color" />{preset}</label>)}</fieldset><label>Bo góc<select disabled={!canEdit || saving} value={draft.theme.radius} onChange={event => setDraft(previous => ({ ...previous, theme: { ...previous.theme, radius: event.target.value } }))}><option value="standard">Tiêu chuẩn</option><option value="soft">Mềm</option></select></label><label>Độ nổi<select disabled={!canEdit || saving} value={draft.theme.depth} onChange={event => setDraft(previous => ({ ...previous, theme: { ...previous.theme, depth: event.target.value } }))}><option value="flat">Phẳng</option><option value="clay">Nổi nhẹ</option></select></label></div>}
    {tab === 'preview' && <div className="experience-preview" data-experience-theme={draft.theme.preset} data-experience-radius={draft.theme.radius} data-experience-depth={draft.theme.depth}><h2>{formatUiText('progress.workspace.title', {}, draft.copy)}</h2><p>{formatUiText('progress.source.operational_proxy')}</p><button type="button" disabled>{formatUiText('common.save', {}, draft.copy)}</button><dl>{UI_COPY_REGISTRY.filter(item => !item.protected && (draft.copy[item.key] ?? item.defaultVi) !== (experience.published.copy[item.key] ?? item.defaultVi)).map(item => <div key={item.key}><dt>{item.key}</dt><dd><del>{experience.published.copy[item.key] ?? item.defaultVi}</del><ins>{draft.copy[item.key] ?? item.defaultVi}</ins></dd></div>)}</dl></div>}
    {tab === 'history' && ['organization.ui_copy.vi', 'organization.ui_theme'].map(key => <button key={key} type="button" onClick={() => setHistoryKey(key)}><History size={16} />{key}</button>)}
    <footer>{canEdit && <><button type="button" disabled={saving} onClick={() => setDraft({ copy: {}, theme: { ...DEFAULT_UI_THEME } })}><RotateCcw size={16} />Mặc định</button><button type="button" disabled={saving || experience.loading || invalid || !changed || !!experience.error || remoteChanged} onClick={publish}><Save size={16} />Xuất bản</button></>}<button type="button" disabled={saving} onClick={() => experience.refresh()}><History size={16} />Tải bản mới</button>{remoteChanged && canEdit && <button type="button" disabled={saving} onClick={() => { setBase(experience.published.config_version); setTab('preview'); }}>Dùng version mới, giữ bản nháp</button>}</footer>
    {invalid && <p role="alert">Nội dung hoặc placeholder không hợp lệ.</p>}
    <SettingsHistoryModal setting={historyKey ? { key: historyKey, labelVi: historyKey, readOnly: !canEdit } : null} isOpen={!!historyKey} onClose={() => setHistoryKey(null)} onRolledBack={() => experience.refresh()} />
  </section>;
}
