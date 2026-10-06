import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  formatRevisionDate,
  formatRevisionValue,
  normalizeSettingHistoryPayload,
  revisionActorLabel,
} from "../src/console/consoleSettingsHistoryModel.js";

const historySource = readFileSync(
  new URL("../src/console/SettingsHistoryModal.jsx", import.meta.url),
  "utf8",
);
const editorSource = readFileSync(
  new URL("../src/console/SettingEditorCard.jsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../src/console/ConsoleSettingsPage.jsx", import.meta.url),
  "utf8",
);

describe("Admin Console settings history and rollback", () => {
  it("normalizes paginated history without manufacturing revisions", () => {
    assert.deepEqual(normalizeSettingHistoryPayload(null), {
      revisions: [], page: 1, pageSize: 10, total: 0, totalPages: 1,
    });
    assert.deepEqual(
      normalizeSettingHistoryPayload({
        revisions: [{ id: "rev-1" }], page: 2, pageSize: 10, total: 21,
      }),
      {
        revisions: [{ id: "rev-1" }], page: 2, pageSize: 10, total: 21, totalPages: 3,
      },
    );
  });

  it("formats revision values, dates and actor fallbacks", () => {
    assert.equal(formatRevisionValue(true), "Bật");
    assert.equal(formatRevisionValue(null), "Chưa có giá trị");
    assert.equal(formatRevisionValue({ enabled: true }), '{\n  "enabled": true\n}');
    assert.equal(formatRevisionDate("invalid"), "Không rõ thời gian");
    assert.equal(revisionActorLabel({ changedBy: { fullName: "Admin A" } }), "Admin A");
    assert.equal(revisionActorLabel({ changedById: "user-1" }), "user-1");
  });

  it("loads history with pagination and exposes complete async states", () => {
    assert.match(historySource, /adminSettingsService\.getRevisions/);
    assert.match(historySource, /page_size: PAGE_SIZE/);
    assert.match(historySource, /Đang tải lịch sử phiên bản/);
    assert.match(historySource, /Không tải được lịch sử/);
    assert.match(historySource, /Chưa có lịch sử thay đổi/);
    assert.match(historySource, /Phân trang lịch sử cấu hình/);
  });

  it("requires confirmation note and refreshes after rollback", () => {
    assert.match(historySource, /Nhập lý do rollback/);
    assert.match(historySource, /adminSettingsService\.rollback/);
    assert.match(historySource, /onRolledBack/);
    assert.match(historySource, /Xác nhận rollback/);
    assert.match(historySource, /role="alert"/);
    assert.match(historySource, /role="status"/);
  });

  it("connects accessible history actions to each settings card", () => {
    assert.match(editorSource, /aria-label={`Xem lịch sử/);
    assert.match(editorSource, /onHistory\?\.\(setting\)/);
    assert.match(pageSource, /<SettingsHistoryModal/);
    assert.match(pageSource, /onHistory={setHistorySetting}/);
  });
});
