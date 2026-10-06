import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';

const pages = ['Students', 'Parents', 'Classes', 'Teachers', 'Templates'];
const actions = ['Thêm học viên', 'Thêm phụ huynh', 'Thêm lớp học', 'Thêm giáo viên', 'Tạo mẫu mới'];

// Render the page composition with inert boundaries so no API or form runs.
const boundaries = `
import {createElement as h} from ${JSON.stringify(import.meta.resolve('react'))};
export const OperationalPage = ({children}) => h('main', null, children);
export const PageIntro = ({title, eyebrow, description, actions, metrics=[], status}) => h('header', null,
  eyebrow, h('h1', null, title), h('p', null, description), actions, status,
  ...metrics.map(m => h('div', {key:m.label}, m.label)));
export const MetricGrid = ({metrics}) => h('section', {'data-metrics':true},
  ...metrics.map(m => h('span', {key:m.label}, m.label)));
export const ListPanel = ({children,countLabel}) => h('section', null,countLabel,children);
export const Link = ({children,to}) => h('a',{href:to},children);
export const useNavigate = () => () => {};
export const isClayReceiptTemplate = () => false;
export const useToast = () => ({});
export const useAuth = () => ({});
export const ConfirmModal = () => null;
export const studentFormSchema = {};
export const parentFormSchema = {};
export const teacherFormSchema = {};
export const classFormSchema = {};
export const bulkActionsService = {};
export const studentsService = {};
export const parentsService = {};
export const classesService = {};
export const teachersService = {};
export const templatesService = {};
export const toDateKey = () => '';
export const useAsyncData = () => ({data:{classes:[],teachers:[]},loading:true,reload(){}});
export default () => null;
`;
const boundaryUrl = `data:text/javascript,${encodeURIComponent(boundaries)}`;

for (const [index, name] of pages.entries()) {
  const file = new URL(`../src/pages/${name}Page.jsx`, import.meta.url);
  const source = readFileSync(file, 'utf8');
  test(`${name}: one metric strip without duplicate hero or table totals`, () => {
    assert.equal((source.match(/<MetricGrid\b/g) || []).length, 1);
    const intro = source.match(/<PageIntro\b[\s\S]*?\n\s*\/>/)?.[0];
    assert.ok(intro);
    assert.doesNotMatch(intro, /metrics=/);
    assert.match(intro, /description=/);
    assert.match(intro, /eyebrow=/);
    assert.doesNotMatch(source, /StudentStatCard|StudentHeroMetric|className="hidden"|summaryMetrics|statCards/);
    assert.doesNotMatch(source, /label: ["'](?:Tổng số|Tổng số GV|Tổng mẫu|Phụ huynh)["']/);
    assert.match(source, /<ListPanel\b/);
    assert.doesNotMatch(source, /operational-avatar/);
    if (name === 'Students') {
      assert.match(source, /bg-primary-100 rounded-full/);
      assert.match(source, /row.student_code/);
      assert.doesNotMatch(source, /\{row.id\}/);
    }
    if (name === 'Parents') assert.match(source, /from-purple-400 to-pink-500/);
    if (name === 'Teachers') assert.match(source, /from-indigo-500 to-purple-600/);
  });
  test(`${name}: renders one heading, metric strip and primary action`, async () => {
    const transformed = await transformWithEsbuild(source, file.pathname, {loader:'jsx',jsx:'automatic'});
    const code = transformed.code.replace(/from\s+["']([^"']+)["']/g, (_, specifier) => {
      if (specifier.startsWith('.') || specifier === 'react-router-dom') return `from ${JSON.stringify(boundaryUrl)}`;
      return `from ${JSON.stringify(import.meta.resolve(specifier))}`;
    });
    const {default: Page} = await import(`data:text/javascript,${encodeURIComponent(code)}`);
    const html = renderToStaticMarkup(createElement(Page));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/data-metrics=/g) || []).length, 1);
    assert.equal(html.split(actions[index]).length - 1, 1);
    assert.match(html, /<p>[^<]+<\/p>/);
    if (name === 'Students') assert.match(html, /href="\/classes"/);
  });
}
