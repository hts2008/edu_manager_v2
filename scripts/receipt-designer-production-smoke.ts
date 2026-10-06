import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const HOST = 'https://edu-manager-gules.vercel.app';
const report: Record<string, any> = { host: HOST, at: new Date().toISOString(), routes: {} };
function check(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

async function request(path: string, token?: string, loginBody?: unknown) {
  const url = new URL(path, HOST);
  check(url.origin === HOST && !url.username && !url.password, 'HOST_GUARD');
  check(!loginBody || url.pathname === '/api/auth/login', 'METHOD_GUARD');
  const response = await fetch(url, { method: loginBody ? 'POST' : 'GET', redirect: 'error',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(loginBody ? { 'Content-Type': 'application/json' } : {}) },
    ...(loginBody ? { body: JSON.stringify(loginBody) } : {}), signal: AbortSignal.timeout(20_000) });
  return response;
}
async function api(path: string, token?: string, body?: unknown) {
  const response = await request(path, token, body);
  report.routes[path] = { status: response.status };
  check(response.status === 200, 'HTTP_STATUS');
  const payload = await response.json();
  check(payload.success === true && payload.data, 'API_ENVELOPE');
  return payload.data;
}
async function templateSnapshot(token: string) {
  const data = await api('/api/templates', token);
  check(Array.isArray(data.templates), 'TEMPLATE_COLLECTION');
  report.routes['/api/templates'].returnedCount = data.templates.length;
  const rows = [...data.templates].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  check(rows.length <= 100, 'TEMPLATE_SNAPSHOT_BOUND');
  const details = [];
  for (const row of rows) {
    check(typeof row.id === 'string', 'TEMPLATE_ID');
    const detail = await api(`/api/templates/${encodeURIComponent(row.id)}`, token);
    check(detail.template && detail.template.json_config !== undefined, 'TEMPLATE_DETAIL');
    const template = { ...detail.template };
    if (typeof template.json_config === 'string') template.json_config = JSON.parse(template.json_config);
    details.push(template);
  }
  return { count: rows.length, hash: hash({ rows, details }) };
}
async function designerAssets() {
  const response = await request('/');
  report.static = { indexStatus: response.status, entryCount: 0, designerChunkCount: 0, markersPresent: false };
  check(response.status === 200, 'STATIC_INDEX');
  const html = await response.text();
  const entries = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)]
    .map(match => match[1]).filter(src => src.startsWith('/assets/') && src.endsWith('.js'));
  check(entries.length > 0 && entries.length <= 12, 'STATIC_ENTRIES');
  report.static.entryCount = entries.length;
  const chunks = new Set<string>();
  for (const entry of entries) {
    const asset = await request(entry); check(asset.status === 200, 'STATIC_ENTRY_STATUS');
    const source = await asset.text();
    for (const match of source.matchAll(/["'](?:\.\/|\/)?(assets\/TemplateDesignerPage-[^"']+\.js)["']/g)) {
      chunks.add(`/${match[1]}`);
    }
    if (source.includes('bindingBoxHeight') && source.includes('receipt_block')) report.static.markersPresent = true;
  }
  check(chunks.size <= 4, 'STATIC_CHUNK_BOUND');
  for (const chunk of chunks) {
    const response = await request(chunk); check(response.status === 200, 'DESIGNER_CHUNK_STATUS');
    const source = await response.text();
    if (source.includes('bindingBoxHeight') && source.includes('receipt_block')) report.static.markersPresent = true;
  }
  report.static.designerChunkCount = chunks.size;
  report.static.verdict = report.static.markersPresent ? 'present' : 'inconclusive';
}

async function main() {
  // This explicit gate is supplied only after the user's deployment READY confirmation.
  check(process.argv.includes('--deployment-ready'), 'WAITING_FOR_DEPLOYMENT_READY');
  const credentials = JSON.parse(readFileSync('.release-private/production-admin.json', 'utf8'));
  check(credentials.url === HOST, 'CREDENTIAL_HOST_GUARD');
  for (const key of ['centerCode', 'username', 'password']) check(typeof credentials[key] === 'string' && credentials[key], 'CREDENTIAL_SHAPE');
  const login = await api('/api/auth/login', undefined, { tenant_slug: credentials.centerCode,
    username: credentials.username, password: credentials.password });
  check(typeof login.token === 'string' && login.token.length > 0, 'AUTH_TOKEN');
  const token = login.token;
  const me = await api('/api/auth/me', token);
  check(me.user?.role === 'admin' && me.user?.tenant_id === 'tenant_default' && !me.user?.is_platform_owner, 'AUTH_IDENTITY');
  report.authenticated = true;
  report.templatesBefore = await templateSnapshot(token);
  for (const [path, key] of [['/api/students?page_size=100', 'students'], ['/api/classes?page_size=100', 'classes'],
    ['/api/receipts?page_size=100', 'receipts'], ['/api/monthly-fees?page_size=100', 'fees']]) {
    const data = await api(path, token);
    check(Array.isArray(data[key]), 'READ_COLLECTION');
    Object.assign(report.routes[path], { returnedCount: data[key].length,
      ...(Number.isFinite(data.total) ? { total: data.total } : {}) });
  }
  const experience = await api('/api/ui-experience', token);
  check(experience.copy && experience.theme, 'UI_EXPERIENCE_SHAPE');
  Object.assign(report.routes['/api/ui-experience'], { copyKeyCount: Object.keys(experience.copy).length,
    themeKeyCount: Object.keys(experience.theme).length, configVersion: experience.config_version });
  await designerAssets();
  report.templatesAfter = await templateSnapshot(token);
  report.templatesUnchanged = report.templatesBefore.hash === report.templatesAfter.hash;
  check(report.templatesUnchanged, 'TEMPLATE_SNAPSHOT_CHANGED');
  report.verdict = 'PASS';
}
main().catch(error => {
  // Never serialize errors, response bodies, usernames, tokens or credentials.
  const known = new Set(['WAITING_FOR_DEPLOYMENT_READY', 'HOST_GUARD', 'METHOD_GUARD', 'HTTP_STATUS',
    'API_ENVELOPE', 'TEMPLATE_COLLECTION', 'TEMPLATE_SNAPSHOT_BOUND', 'TEMPLATE_ID', 'TEMPLATE_DETAIL',
    'STATIC_INDEX', 'STATIC_ENTRIES', 'STATIC_ENTRY_STATUS', 'STATIC_CHUNK_BOUND', 'DESIGNER_CHUNK_STATUS',
    'CREDENTIAL_HOST_GUARD', 'CREDENTIAL_SHAPE', 'AUTH_TOKEN', 'AUTH_IDENTITY', 'READ_COLLECTION',
    'UI_EXPERIENCE_SHAPE', 'TEMPLATE_SNAPSHOT_CHANGED']);
  report.verdict = 'FAIL'; report.errorCode = known.has(error?.message) ? error.message : 'SMOKE_FAILED';
  process.exitCode = 1;
}).finally(() => {
  // Detail route identifiers are private; output only aggregate statuses.
  const details = Object.entries(report.routes).filter(([path]) => path.startsWith('/api/templates/'));
  report.templateDetailReads = { count: details.length, statuses: [...new Set(details.map(([, value]: any) => value.status))] };
  for (const [path] of details) delete report.routes[path];
  console.info(JSON.stringify(report, null, 2));
});
