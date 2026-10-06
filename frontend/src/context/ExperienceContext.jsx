import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { experienceService } from '../services/api';
import { DEFAULT_UI_THEME, UI_EXPERIENCE_SCHEMA, resolveUiExperience, formatUiText, validateExperienceCopy, validateExperienceTheme } from '../../../lib/ui-experience';
import '../design/experience.css';

const ExperienceContext = createContext(null);
const defaults = { copy: {}, theme: DEFAULT_UI_THEME, config_version: 0 };
export function ExperienceProvider({ children }) {
  const { user, hasPermission } = useAuth();
  const scope = user?.id && user?.tenant_id ? JSON.stringify([user.tenant_id, user.id]) : null;
  const epoch = useRef(0);
  const [state, setState] = useState({ scope: null, published: defaults, loading: false, error: null });
  const refresh = useCallback(async () => {
    const ticket = ++epoch.current;
    if (!scope) { setState({ scope: null, published: defaults, loading: false, error: null }); return; }
    setState(previous => ({ scope, published: previous.scope === scope ? previous.published : defaults, loading: true, error: null }));
    try {
      const response = await experienceService.get();
      if (response?.success === false) throw new Error('Experience fetch failed');
      const published = UI_EXPERIENCE_SCHEMA.parse(response.data);
      if (ticket === epoch.current) setState(previous => ({ scope, published: previous.scope === scope && previous.published.config_version > published.config_version ? previous.published : published, loading: false, error: null }));
    } catch {
      if (ticket === epoch.current) setState(previous => ({ ...previous, loading: false, error: 'Không tải được cấu hình giao diện.' }));
    }
  }, [scope]);
  useLayoutEffect(() => { refresh(); return () => { ++epoch.current; }; }, [refresh]);
  const publish = useCallback(async ({ copy, theme, expected_config_version }) => {
    if (!scope || !hasPermission('console.experience.view') || !hasPermission('console.experience.edit')) throw new Error('Không có quyền xuất bản.');
    if (!Number.isSafeInteger(expected_config_version) || expected_config_version < 0) throw new Error('Invalid configuration version');
    const ticket = ++epoch.current;
    const response = await experienceService.save({ copy: validateExperienceCopy(copy), theme: validateExperienceTheme(theme), expected_config_version });
    if (response?.success === false) {
      const error = new Error('Không thể xuất bản cấu hình.');
      error.status = response.status ?? response.error?.status;
      error.code = response.error?.code;
      throw error;
    }
    const published = UI_EXPERIENCE_SCHEMA.parse(response.data);
    if (published.config_version <= expected_config_version) throw new Error('Chưa xác định kết quả lưu.');
    if (ticket !== epoch.current) throw new Error('Phiên làm việc đã thay đổi.');
    setState({ scope, published, loading: false, error: null });
    return published;
  }, [scope, hasPermission]);
  const current = state.scope === scope ? state : { scope, published: defaults, loading: !!scope, error: null };
  const resolved = resolveUiExperience(current.published);
  const value = { ...current, scope, theme: resolved.theme, text: (key, params) => formatUiText(key, params, resolved.copy), refresh, publish };
  return <ExperienceContext.Provider value={value}><div data-experience-root data-experience-theme={resolved.theme.preset} data-experience-radius={resolved.theme.radius} data-experience-depth={resolved.theme.depth}>{children}</div></ExperienceContext.Provider>;
}
export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error('useExperience requires ExperienceProvider');
  return context;
}
