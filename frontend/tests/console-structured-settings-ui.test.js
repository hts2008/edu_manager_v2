import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const card = readFileSync("src/console/SettingEditorCard.jsx", "utf8");
const editor = readFileSync("src/console/StructuredSettingEditor.jsx", "utf8");

describe("Admin Console structured settings UI", () => {
  it("integrates the structured editor while preserving the generic JSON fallback", () => {
    assert.match(card, /StructuredSettingEditor/);
    assert.match(card, /isStructuredEditor/);
    assert.match(card, /textarea/);
    assert.match(card, /structuredValidationError/);
  });

  it("offers accessible finance controls", () => {
    assert.match(editor, /fieldset/);
    assert.match(editor, /Trạng thái tính phí/);
    assert.match(editor, /Ngày học mặc định/);
    assert.match(editor, /Chính sách phụ thu/);
    assert.match(editor, /type="number"/);
  });

  it("offers repeatable academic catalog and rubric controls", () => {
    assert.match(editor, /Thêm track/);
    assert.match(editor, /Từ khóa nhận diện/);
    assert.match(editor, /Tổng trọng số/);
    assert.match(editor, /Hệ số tối thiểu/);
    assert.match(editor, /Hệ số tối đa/);
  });

  it("makes effective month and impact semantics visible", () => {
    assert.match(card, /settingImpactState/);
    assert.match(card, /Tháng bắt đầu áp dụng/);
    assert.match(card, /dữ liệu đã chốt/i);
  });
});
