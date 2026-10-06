import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
const expect = (actual: any) => ({
  toEqual: (value: unknown) => assert.deepEqual(actual, value),
  toBe: (value: unknown) => assert.equal(actual, value),
  toThrow: () => assert.throws(actual),
  toBeTruthy: () => assert.ok(actual),
  toContain: (value: string) => assert.ok(actual.includes(value)),
  toBeGreaterThan: (value: number) => assert.ok(actual > value),
  toBeGreaterThanOrEqual: (value: number) => assert.ok(actual >= value),
});
import { DEFAULT_UI_COPY, UI_THEME_PRESETS, validateExperienceCopy, validateExperienceTheme, resolveUiExperience, formatUiText, contrastRatio } from '../lib/ui-experience';

describe('bounded experience configuration', () => {
  it('accepts only editable known keys', () => {
    expect(validateExperienceCopy({ 'common.save': 'Lưu ngay' })).toEqual({ 'common.save': 'Lưu ngay' });
    for (const key of ['unknown', 'status.paid', 'status.finalized', 'error.unauthorized']) expect(() => validateExperienceCopy({ [key]: 'Đổi' })).toThrow();
  });
  it('rejects markup, executable syntax and invisible controls', () => {
    for (const value of ['<b>Lưu</b>', 'javascript:alert(1)', '&lt;script&gt;', 'a\u202eb', 'a\n']) expect(() => validateExperienceCopy({ 'common.save': value })).toThrow();
  });
  it('requires the exact placeholder contract', () => {
    expect(validateExperienceCopy({ 'progress.student_heading': 'Học viên {{studentName}}' })).toBeTruthy();
    for (const value of ['Học viên', '{{month}}', '{{studentName}} {bad}']) expect(() => validateExperienceCopy({ 'progress.student_heading': value })).toThrow();
  });
  it('bounds length and locale', () => {
    expect(() => validateExperienceCopy({ 'common.save': 'x'.repeat(1000) })).toThrow();
    expect(() => validateExperienceCopy({}, 'en-US')).toThrow();
  });
  it('fails safely to compiled defaults', () => {
    const result = resolveUiExperience({ copy: { 'status.paid': 'Không trả' }, theme: { preset: 'evil' } });
    expect(result.copy).toEqual(DEFAULT_UI_COPY);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(formatUiText('unknown')).toBe('Nội dung chưa khả dụng.');
    expect(formatUiText('progress.student_heading')).toBe('Nội dung chưa khả dụng.');
    expect(formatUiText('status.paid', {}, { 'status.paid': 'evil' })).toBe(DEFAULT_UI_COPY['status.paid']);
  });
  it('returns plain text parameters, never markup instructions', () => {
    expect(formatUiText('progress.student_heading', { studentName: '<img>' })).toContain('<img>');
  });
  it('allows only fixed theme enums', () => {
    expect(validateExperienceTheme({ preset: 'mint', radius: 'standard', depth: 'clay' })).toBeTruthy();
    expect(() => validateExperienceTheme({ preset: 'mint', css: 'display:none' })).toThrow();
    expect(() => validateExperienceTheme({ preset: '#fff', radius: 'standard', depth: 'clay' })).toThrow();
  });
  it('checks each preset text and interactive border contrast', () => {
    for (const theme of Object.values(UI_THEME_PRESETS)) {
      for (const [fg, bg] of [[theme.ink, theme.surface], [theme.muted, theme.surface], [theme.onPrimary, theme.primary]]) expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.border, theme.surface)).toBeGreaterThanOrEqual(3);
    }
  });
});
