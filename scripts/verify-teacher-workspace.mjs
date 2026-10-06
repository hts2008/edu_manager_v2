import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from '../frontend/node_modules/playwright/index.mjs';

const base = process.env.UX_REVIEW_URL || 'http://127.0.0.1:3088';
assert.equal(new URL(base).hostname, '127.0.0.1', 'Local fixture verification only');
assert.ok(process.env.UX_REVIEW_PASSWORD, 'Local fixture password required');
const fixture = JSON.parse(await readFile('docs/artifacts/tuition-progress-execution-2026-10-05/browser-fixture.json', 'utf8'));
assert.equal(fixture.purpose, 'browser');
assert.match(fixture.run, /browser$/);
const output = 'docs/artifacts/teacher-workspace-execution-2026-10-05';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const checks = [];
let originalRow;
let originalExperience;
let changedRow = false;
let changedExperience = false;
const classId = `${fixture.run}-local-review-v1-class-0`;
const date = '2026-10-03';
const query = new URLSearchParams({ class_id: classId, month: '2026-10', entry_date: date });
async function api(path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(`/api/${path}`, { method, headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json',
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }, { path, method, body });
}
async function openRoster() {
  await page.goto(`${base}/student-progress`);
  const roster = page.getByTestId('progress-roster');
  const loaded = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/student-progress/roster' && response.request().method() === 'GET'
      && url.searchParams.get('entry_date') === date && url.searchParams.get('class_id') === classId;
  });
  await roster.locator('select').first().selectOption(classId);
  await roster.locator('input[type=date]').fill(date);
  assert.equal((await loaded).status(), 200);
  await page.locator('[data-testid="progress-roster"][data-loading="false"]').waitFor();
  await roster.locator('form').first().waitFor();
  return roster;
}
async function noOverflow() {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No document horizontal overflow');
}
try {
  await page.goto(`${base}/login`);
  await page.locator('#tenant-slug').fill(fixture.tenants[0]);
  await page.locator('#username').fill(fixture.users[0]);
  await page.locator('#password').fill(process.env.UX_REVIEW_PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(`${base}/`);
  checks.push('Real tenant-aware login');
  const roster = await openRoster();
  const snapshot = await api(`student-progress/roster?${query}`);
  assert.equal(snapshot.status, 200);
  originalRow = snapshot.body.data.rows[0];
  assert.ok(originalRow);
  const row = roster.getByRole('form', { name: originalRow.student_name, exact: true });
  const listening = row.getByLabel(`${originalRow.student_name} listening`, { exact: true });
  const original = originalRow.skills.listening.score;
  const next = original === 0 ? 1 : 0;
  await listening.fill(String(next));
  const saveResponse = page.waitForResponse(response => response.url().endsWith('/api/student-progress/roster') && response.request().method() === 'PATCH');
  await row.locator('button[type=submit]').click();
  assert.equal((await saveResponse).status(), 200);
  changedRow = true;
  await row.getByText('Đã lưu', { exact: false }).waitFor();
  assert.equal((await api(`student-progress/roster?${query}`)).body.data.rows[0].skills.listening.score, next);
  checks.push('Inline save and canonical API readback, including real zero');
  const reading = row.getByLabel(`${originalRow.student_name} reading`, { exact: true });
  const readingDraft = originalRow.skills.reading.score === 99 ? 98 : originalRow.skills.reading.score + 1;
  await reading.fill(String(readingDraft));
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('tab', { name: 'Tổng quan', exact: true }).click();
  assert.equal(await page.getByRole('tab', { name: 'Cập nhật', exact: true }).getAttribute('aria-selected'), 'true');
  assert.equal(await reading.inputValue(), String(readingDraft));
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#teacher-shell-navigation').getByRole('link', { name: 'Học viên', exact: true }).click();
  assert.equal(new URL(page.url()).pathname, '/student-progress');
  assert.equal(await reading.inputValue(), String(readingDraft));
  checks.push('Dirty draft survives cancelled tab and sidebar navigation');
  const retryPayloads = [];
  await page.route('**/api/student-progress/roster', async route => {
    if (route.request().method() !== 'PATCH') return route.continue();
    retryPayloads.push(route.request().postDataJSON());
    await route.abort('internetdisconnected');
  });
  await row.locator('button[type=submit]').click();
  await row.getByRole('alert').waitFor();
  assert.equal(await reading.inputValue(), String(readingDraft));
  await page.unroute('**/api/student-progress/roster');
  const retry = page.waitForRequest(request => request.url().endsWith('/api/student-progress/roster') && request.method() === 'PATCH');
  await reading.press('Enter');
  const retried = (await retry).postDataJSON();
  assert.deepEqual(retried, retryPayloads[0]);
  await row.getByText('Đã lưu', { exact: false }).waitFor();
  checks.push('Network failure retains draft; Enter retry reuses exact operation payload');
  await reading.fill(String(originalRow.skills.reading.score));
  const external = (await api(`student-progress/roster?${query}`)).body.data.rows.find(item => item.student_id === originalRow.student_id);
  const other = await api('student-progress/roster', 'PATCH', { student_id: originalRow.student_id, class_id: classId,
    entry_date: date, expected_evidence_version: external.evidence_version, operation_id: randomUUID(), changes: { speaking: 84 } });
  assert.equal(other.status, 200);
  const conflict = page.waitForResponse(response => response.url().endsWith('/api/student-progress/roster') && response.request().method() === 'PATCH');
  await row.locator('button[type=submit]').click();
  assert.equal((await conflict).status(), 409);
  await row.getByRole('alert').waitFor();
  assert.equal(await reading.inputValue(), String(originalRow.skills.reading.score));
  assert.equal(await row.locator('button[type=submit]').isDisabled(), true);
  const conflictRow = (await api(`student-progress/roster?${query}`)).body.data.rows.find(item => item.student_id === originalRow.student_id);
  assert.equal((await api('student-progress/roster', 'PATCH', { student_id: originalRow.student_id, class_id: classId,
    entry_date: date, expected_evidence_version: conflictRow.evidence_version, operation_id: randomUUID(),
    changes: { reading: originalRow.skills.reading.score, speaking: originalRow.skills.speaking.score } })).status, 200);
  page.once('dialog', dialog => dialog.accept());
  const reloadResponse = page.waitForResponse(response => response.url().includes('/api/student-progress/roster?') && response.request().method() === 'GET');
  await roster.getByRole('button', { name: 'Tải lại bảng điểm', exact: true }).click();
  assert.equal((await reloadResponse).status(), 200);
  await page.locator('[data-testid="progress-roster"][data-loading="false"]').waitFor();
  await row.locator('button[type=submit][disabled]').waitFor();
  assert.equal(await reading.inputValue(), String(originalRow.skills.reading.score));
  checks.push('Concurrent API edit returns 409 and retains draft; explicit reload fetches fresh evidence');
  await page.screenshot({ path: `${output}/roster-desktop.png`, fullPage: false });
  const rail = page.locator('#teacher-shell-navigation');
  const before = await rail.boundingBox();
  await page.locator('.eduflow-main').evaluate(element => { element.scrollTop = 500; });
  const after = await rail.boundingBox();
  assert.equal(before.y, after.y);
  assert.equal(before.x, after.x);
  await page.getByRole('button', { name: 'Thu gọn menu', exact: true }).click();
  assert.equal(Math.round((await rail.boundingBox()).width), 72);
  await page.reload();
  await page.getByRole('button', { name: 'Mở rộng menu', exact: true }).waitFor();
  assert.equal(Math.round((await rail.boundingBox()).width), 72);
  checks.push('Fixed rail and actor-scoped collapse preference survives reload');
  await page.getByRole('button', { name: 'Mở rộng menu', exact: true }).click();
  await noOverflow();
  originalExperience = (await api('ui-experience')).body.data;
  assert.ok(Number.isInteger(originalExperience.config_version));
  await page.goto(`${base}/admin/experience`);
  await page.getByLabel('progress.workspace.title', { exact: true }).fill('Theo dõi học tập');
  await page.getByRole('button', { name: 'Giao diện', exact: true }).click();
  await page.getByRole('radio', { name: 'berry', exact: true }).check();
  const publishResponse = page.waitForResponse(response => response.url().endsWith('/api/ui-experience') && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
  assert.equal((await publishResponse).status(), 200);
  changedExperience = true;
  await page.getByText('Đã xuất bản.', { exact: true }).waitFor();
  await page.screenshot({ path: `${output}/experience-desktop.png`, fullPage: false });
  const published = (await api('ui-experience')).body.data;
  assert.equal(published.copy['progress.workspace.title'], 'Theo dõi học tập');
  assert.equal(published.theme.preset, 'berry');
  await openRoster();
  await page.getByRole('heading', { name: 'Theo dõi học tập', exact: true, level: 1 }).waitFor();
  assert.equal(await page.locator('[data-experience-root]').getAttribute('data-experience-theme'), 'berry');
  const primary = await page.getByTestId('progress-roster').locator('.btn-primary').first().evaluate(element => getComputedStyle(element).backgroundColor);
  assert.equal(primary, 'rgb(145, 58, 98)');
  checks.push('Tenant copy/theme publish reaches live workspace and survives route reload');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  const menu = page.getByRole('button', { name: 'Mở menu', exact: true });
  await menu.click();
  await rail.getByRole('button', { name: 'Đóng menu', exact: true }).waitFor();
  assert.equal(await page.locator('.teacher-shell-content').evaluate(element => element.inert), true);
  const focusable = rail.locator('a[href], button:not([disabled]), input:not([disabled])');
  await focusable.last().focus();
  await page.keyboard.press('Tab');
  assert.ok(await focusable.first().evaluate(element => element === document.activeElement));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.teacher-shell-content').inert);
  assert.ok(await menu.evaluate(element => element === document.activeElement));
  await page.screenshot({ path: `${output}/roster-mobile.png`, fullPage: false });
  checks.push('Mobile no overflow, drawer Escape/focus restoration and inert background');
  for (const width of [768, 1024, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow();
    await page.screenshot({ path: `${output}/roster-${width}.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 720, height: 500 });
  await noOverflow();
  checks.push('390/768/1024/1920 and 200-percent equivalent layout width has no horizontal overflow');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openRoster();
  const persisted = (await api(`student-progress/roster?${query}`)).body.data.rows[0];
  assert.equal(persisted.skills.listening.score, next);
  assert.deepEqual(persisted.skills.reading, originalRow.skills.reading);
  checks.push('Reload retains edited score and unchanged evidence');
  assert.deepEqual(errors, []);
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: false });
  console.error(JSON.stringify({ failure: error.message, pageErrors: errors, visibleText: (await page.locator('body').innerText()).slice(0, 2500) }));
  throw error;
} finally {
  if (changedRow) {
    const current = (await api(`student-progress/roster?${query}`)).body.data.rows.find(row => row.student_id === originalRow.student_id);
    const restored = await api('student-progress/roster', 'PATCH', { student_id: originalRow.student_id, class_id: classId,
      entry_date: date, expected_evidence_version: current.evidence_version, operation_id: randomUUID(),
      changes: { listening: originalRow.skills.listening.score, reading: originalRow.skills.reading.score, speaking: originalRow.skills.speaking.score } });
    assert.equal(restored.status, 200, 'Restore owned local score');
  }
  if (changedExperience) {
    const current = (await api('ui-experience')).body.data;
    const restored = await api('ui-experience', 'PUT', { copy: originalExperience.copy, theme: originalExperience.theme,
      expected_config_version: current.config_version });
    assert.equal(restored.status, 200, 'Restore local experience using a new immutable revision');
  }
  await writeFile(`${output}/browser-checks.json`, JSON.stringify({ checkedAt: new Date().toISOString(), checks, pageErrors: errors,
    fixturePurpose: fixture.purpose, scope: 'isolated local synthetic fixture', restored: { row: changedRow, experience: changedExperience } }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: checks.length, checks }));
