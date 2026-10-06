import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const pageSource = readFileSync(
  new URL("../src/console/IntegrationsPage.jsx", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(new URL("../src/services/api.js", import.meta.url), "utf8");
const featuresApiSource = readFileSync(new URL("../../server/api/admin/features.ts", import.meta.url), "utf8");
const integrationsApiSource = readFileSync(new URL("../../server/api/admin/integrations.ts", import.meta.url), "utf8");

describe("Admin Console integrations and feature flags", () => {
  it("implements both backend API contracts with tenant authentication", () => {
    assert.match(apiSource, /request\("\/admin\/features", options\)/);
    assert.match(apiSource, /request\("\/admin\/integrations", options\)/);
    assert.match(featuresApiSource, /export default requirePermission\("console\.integrations\.edit", handler\)/);
    assert.match(integrationsApiSource, /export default requirePermission\("console\.integrations\.edit", handler\)/);
    assert.match(pageSource, /adminFeaturesService\.list\(options\)/);
    assert.match(pageSource, /adminIntegrationsService\.list\(options\)/);
    assert.match(pageSource, /adminIntegrationsService/);
    assert.match(pageSource, /adminFeaturesService/);
    assert.doesNotMatch(pageSource, /fetch\(/);
    assert.match(pageSource, /kind: REMINDER_KIND/);
    assert.match(pageSource, /const payload = \{ kind, config, secret \}/);
    assert.match(pageSource, /secret/);
    assert.match(pageSource, /adminIntegrationsService\.test\(kind\)/);
    assert.match(apiSource, /\/admin\/integrations\/\$\{encodeURIComponent\(kind\)\}\/test/);
  });

  it("renders and updates the two registered feature flags", () => {
    assert.match(pageSource, /flags\.fee_reminders_enabled/);
    assert.match(pageSource, /flags\.parent_portal_enabled/);
    assert.match(pageSource, /role="switch"/);
    assert.match(pageSource, /aria-checked/);
    assert.match(pageSource, /pendingFeature/);
  });

  it("shows integration readiness without exposing secret values", () => {
    assert.match(pageSource, /endpoint_configured/);
    assert.match(pageSource, /credential_configured/);
    assert.match(pageSource, /environment_allows_send/);
    assert.match(pageSource, /Không hiển thị thông tin nhạy cảm/);
    assert.doesNotMatch(pageSource, /integration\.token/);
    assert.doesNotMatch(pageSource, /value=\{integration\.secret_masked\}/);
  });

  it("edits provider URL, enabled state and masked credential safely", () => {
    assert.match(pageSource, /URL provider/);
    assert.match(pageSource, /type="url"/);
    assert.match(pageSource, /Kích hoạt kênh gửi/);
    assert.match(pageSource, /type="password"/);
    assert.match(pageSource, /Để trống để giữ token hiện tại/);
    assert.match(pageSource, /delete payload\.secret/);
    assert.match(pageSource, /const clearProviderSecret[\s\S]*?service\.updateProvider\([\s\S]*?null,\s*\)/);
    assert.match(pageSource, /Xóa token đã lưu/);
    assert.match(pageSource, /Lưu cấu hình provider/);
  });

  it("supports test-send with explicit progress and result feedback", () => {
    assert.match(pageSource, /testIntegration/);
    assert.match(pageSource, /testingIntegration/);
    assert.match(pageSource, /Đang gửi thử/);
    assert.match(pageSource, /Gửi thử/);
    assert.match(pageSource, /Đã gửi thử thành công/);
  });

  it("supports editing and saving the reminder message template", () => {
    assert.match(pageSource, /message_template/);
    assert.match(pageSource, /Lưu mẫu tin nhắn/);
    assert.match(pageSource, /savingTemplate/);
    assert.match(pageSource, /maxLength=\{1000\}/);
    assert.match(pageSource, /Mẫu tin nhắn không được để trống/);
  });

  it("provides loading, error, empty and success feedback in Vietnamese", () => {
    assert.match(pageSource, /<AsyncBoundary/);
    assert.match(pageSource, /Đang tải cấu hình tích hợp/);
    assert.match(pageSource, /Không tải được cấu hình tích hợp/);
    assert.match(pageSource, /Chưa có cấu hình tích hợp/);
    assert.match(pageSource, /role="status"/);
    assert.match(pageSource, /Đã lưu mẫu tin nhắn nhắc học phí/);
  });
});
