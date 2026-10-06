import { z } from 'zod';

const entry = (key: string, defaultVi: string, maxLength = 80, placeholders: readonly string[] = [], protectedLabel = false) =>
  Object.freeze({ key, defaultVi, labelVi: defaultVi, descriptionVi: key, purpose: protectedLabel ? 'protected' : 'presentation', maxLength, placeholders, protected: protectedLabel });
export const UI_COPY_REGISTRY = Object.freeze([
  entry('nav.progress', 'Tiến độ'), entry('nav.students', 'Học viên'),
  entry('common.save', 'Lưu'), entry('common.cancel', 'Hủy'), entry('common.retry', 'Thử lại'),
  entry('common.loading', 'Đang tải'), entry('common.empty', 'Chưa có dữ liệu'),
  entry('progress.workspace.title', 'Tiến độ học tập'), entry('progress.column.student', 'Học viên'),
  entry('progress.column.score', 'Điểm đánh giá'),
  entry('progress.student_heading', 'Học viên {{studentName}}', 160, ['studentName']),
  entry('progress.period', '{{className}} - {{month}}', 160, ['className', 'month']),
  entry('status.finalized', 'Đã chốt', 80, [], true), entry('status.pending', 'Chờ xử lý', 80, [], true),
  entry('status.paid', 'Đã thanh toán', 80, [], true),
  entry('error.unauthorized', 'Bạn không có quyền thực hiện thao tác này.', 160, [], true),
  entry('progress.source.operational_proxy', 'Chỉ số hoạt động, chưa phải điểm đánh giá học tập', 160, [], true),
  entry('progress.source.missing', 'Chưa đủ bằng chứng đánh giá.', 160, [], true),
  entry('warning.irreversible', 'Thao tác này không thể hoàn tác.', 160, [], true),
  entry('error.commit_unknown', 'Chưa xác định kết quả lưu. Kiểm tra dữ liệu trước khi thử lại.', 160, [], true),
  entry('error.conflict', 'Cấu hình đã thay đổi. Bản nháp được giữ lại.', 160, [], true),
]);
export const DEFAULT_UI_COPY: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(UI_COPY_REGISTRY.map(item => [item.key, item.defaultVi])));
const unsafe = /[<>\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]|&(?:lt|gt|#\d+|#x[\da-f]+);|javascript\s*:|data\s*:|url\s*\(|expression\s*\(|@import/i;
function validText(value: string, item: typeof UI_COPY_REGISTRY[number]) {
  const tokens = [...value.matchAll(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g)].map(match => match[1]);
  return value.trim().length > 0 && !unsafe.test(value) && !/[{}]/.test(value.replace(/\{\{[A-Za-z][A-Za-z0-9]*\}\}/g, '')) &&
    tokens.every(token => item.placeholders.includes(token)) && item.placeholders.every(token => tokens.includes(token));
}
export const UI_COPY_SCHEMA = z.object(Object.fromEntries(UI_COPY_REGISTRY.filter(item => !item.protected).map(item =>
  [item.key, z.string().max(item.maxLength).refine(value => validText(value, item), 'Invalid plain text or placeholders').optional()]))).strict();
export const UI_THEME_SCHEMA = z.object({ preset: z.enum(['mint', 'ocean', 'berry']), radius: z.enum(['standard', 'soft']), depth: z.enum(['flat', 'clay']) }).strict();
export type UiTheme = z.infer<typeof UI_THEME_SCHEMA>;
export const DEFAULT_UI_THEME: UiTheme = Object.freeze({ preset: 'mint', radius: 'standard', depth: 'clay' });
const palette = { canvas: '#F6F8FA', surface: '#FFFFFF', ink: '#202A32', muted: '#53616B', border: '#6D7F89', onPrimary: '#FFFFFF' };
export const UI_THEME_PRESETS = Object.freeze({
  mint: Object.freeze({ ...palette, primary: '#09685E' }),
  ocean: Object.freeze({ ...palette, primary: '#165B8A' }),
  berry: Object.freeze({ ...palette, primary: '#913A62' }),
});
export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Expected fixed hex color');
    const values = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function validateExperienceCopy(input: unknown, locale = 'vi-VN'): Record<string, string> {
  if (locale !== 'vi-VN') throw new Error('Unsupported experience locale');
  return UI_COPY_SCHEMA.parse(input) as Record<string, string>;
}
export function validateExperienceTheme(input: unknown): UiTheme { return UI_THEME_SCHEMA.parse(input); }
export const UI_EXPERIENCE_SCHEMA = z.object({ copy: UI_COPY_SCHEMA, theme: UI_THEME_SCHEMA, config_version: z.number().int().nonnegative() }).strict();
export function getUiThemeTokens(input: unknown) {
  const theme = validateExperienceTheme(input);
  return Object.freeze({ ...UI_THEME_PRESETS[theme.preset], radius: theme.radius === 'soft' ? 8 : 6, depth: theme.depth });
}
export function resolveUiExperience(input: unknown) {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const copy = UI_COPY_SCHEMA.safeParse(source.copy ?? {}), theme = UI_THEME_SCHEMA.safeParse(source.theme ?? DEFAULT_UI_THEME);
  return { copy: Object.freeze({ ...DEFAULT_UI_COPY, ...(copy.success ? copy.data : {}) }),
    overrides: copy.success ? copy.data : {}, theme: theme.success ? theme.data : DEFAULT_UI_THEME,
    diagnostics: [...(copy.success ? [] : ['invalid-copy']), ...(theme.success ? [] : ['invalid-theme'])] };
}
export function formatUiText(key: string, params: Record<string, string | number> = {}, copy: Readonly<Record<string, string>> = DEFAULT_UI_COPY): string {
  const item = UI_COPY_REGISTRY.find(value => value.key === key);
  if (!item) return 'Nội dung chưa khả dụng.';
  const candidate = item.protected ? item.defaultVi : copy[key] ?? item.defaultVi;
  const template = candidate.length <= item.maxLength && validText(candidate, item) ? candidate : item.defaultVi;
  if (item.placeholders.some(token => !Object.hasOwn(params, token) || !['string', 'number'].includes(typeof params[token]) || String(params[token]).length > 160 || /[\u0000-\u001f\u007f]/.test(String(params[token])) || (typeof params[token] === 'number' && !Number.isFinite(params[token])))) return 'Nội dung chưa khả dụng.';
  return template.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (_, token: string) => String(params[token]));
}
