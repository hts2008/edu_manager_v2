import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const titles = {
  UserManagementPage: "Quản lý người dùng",
  ImportPage: "Import CSV",
  FeeRemindersPage: "Fee Reminders",
  BackupsPage: "Backups",
  RecycleBinPage: "Recycle Bin",
  CenterSettingsPage: "Cài đặt trung tâm",
};
const pages = Object.fromEntries(Object.keys(titles).map((name) => [
  name, readFileSync(new URL(`../src/pages/${name}.jsx`, import.meta.url), "utf8"),
]));

test("admin routes retain original headings and card presentation with modest spacing", () => {
  for (const [name, source] of Object.entries(pages)) {
    assert.ok(source.includes(`>${titles[name]}</h1>`), name);
    assert.equal((source.match(/<h1\b/g) || []).length, 1, name);
    assert.ok(source.includes('className="space-y-4"'), name);
    assert.ok(source.includes('className="card"'), name);
    assert.ok(source.includes('className="card-body'), name);
    assert.doesNotMatch(source, /PageIntro|operational-page|className="border-t border-gray-200"/, name);
  }
});

test("admin actions retain API contracts and destructive-operation guards", () => {
  for (const expression of ["usersService.create(payload)", "usersService.update(modal.user.id, payload)", "usersService.resetPassword(modal.user.id, password)", "usersService.deactivate(user.id)", 'user.status === "active"']) {
    assert.ok(pages.UserManagementPage.includes(expression), expression);
  }
  for (const expression of ["importService.previewStudents(csv)", "importService.commitStudents(csv)", "preview.summary.invalid_rows === 0", "disabled={!canCommit || loading}", "onConfirm={commitImport}", "Thao tác này sẽ tạo dữ liệu thật", "rollback nếu có lỗi", "issueText(row.warnings)", "row.parent_action"]) {
    assert.ok(pages.ImportPage.includes(expression), expression);
  }
  for (const expression of ["feeRemindersService.preview(month)", "feeRemindersService.send(month, dryRun)", "onConfirm={() => runSend(false)}", "provider và opt-in policy", "item.send_status || item.status"]) {
    assert.ok(pages.FeeRemindersPage.includes(expression), expression);
  }
  for (const expression of ["backupsService.run(dryRun)", "backupsService.verify(verifyUrl)", "disabled={!verifyUrl || loading}", "Object.entries(counts)", "backup?.encrypted", "backup?.uploaded"]) {
    assert.ok(pages.BackupsPage.includes(expression), expression);
  }
  for (const expression of ["recycleBinService.getAll(nextResource)", 'onConfirm={() => runAction("purge", purgeTarget)}', 'onClick={() => runAction("restore", item)}', "Thao tác này không thể khôi phục", "data?.by_resource?.[item.value]?.length"]) {
    assert.ok(pages.RecycleBinPage.includes(expression), expression);
  }
  for (const expression of ["centerSettingsService.update(formData)", "onSubmit={handleSubmit}", "disabled={loading || saving}", "formData.center_email", "error.message"]) {
    assert.ok(pages.CenterSettingsPage.includes(expression), expression);
  }
});

test("summary data appears once with original metric cards", () => {
  for (const key of ["total", "total_amount", "sent"]) {
    assert.equal((pages.FeeRemindersPage.match(new RegExp(`data\\?\\.summary\\?\\.${key}\\b`, "g")) || []).length, 1, key);
  }
  assert.ok(pages.ImportPage.includes('data-testid="import-summary"'));
  assert.match(pages.ImportPage, /key=\{label\} className="card"/);
  assert.match(pages.BackupsPage, /key=\{table\} className="rounded border/);
});
