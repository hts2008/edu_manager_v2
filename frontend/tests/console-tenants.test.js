import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const pageSource = readFileSync(
  new URL("../src/console/TenantsPage.jsx", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(new URL("../src/services/api.js", import.meta.url), "utf8");
const tenantsApiSource = readFileSync(new URL("../../server/api/admin/tenants.ts", import.meta.url), "utf8");

describe("Admin Console tenant management", () => {
  it("implements the GET, POST and PATCH tenant API contract", () => {
    assert.match(apiSource, /list: \(options = \{\}\) => request\("\/admin\/tenants", options\)/);
    assert.match(apiSource, /create: \(data\) => request\("\/admin\/tenants", \{ method: "POST"/);
    assert.match(apiSource, /update: \(data\) => request\("\/admin\/tenants", \{ method: "PATCH"/);
    assert.match(tenantsApiSource, /export default requireAuth\(handler as any\)/);
    assert.match(tenantsApiSource, /assertPlatformOwner\(req\.user\)/);
    assert.match(pageSource, /adminTenantsService/);
    assert.doesNotMatch(pageSource, /fetch\(/);
  });

  it("fails closed for users who are not platform owners", () => {
    assert.match(pageSource, /is_platform_owner/);
    assert.match(pageSource, /isPlatformOwner/);
    assert.match(pageSource, /if \(!platformOwner\)/);
    assert.match(pageSource, /Chỉ Platform Owner được truy cập/);
  });

  it("provides loading, error, empty and success states", () => {
    assert.match(pageSource, /<AsyncBoundary/);
    assert.match(pageSource, /Đang tải danh sách trung tâm/);
    assert.match(pageSource, /Không tải được danh sách trung tâm/);
    assert.match(pageSource, /Chưa có trung tâm/);
    assert.match(pageSource, /Danh sách trung tâm/);
  });

  it("supports create, edit and active or suspended lifecycle changes", () => {
    assert.match(pageSource, /Thêm trung tâm/);
    assert.match(pageSource, /Cập nhật trung tâm/);
    assert.match(pageSource, /value: "active"/);
    assert.match(pageSource, /value: "suspended"/);
    assert.match(pageSource, /role="dialog"/);
    assert.match(pageSource, /overflow-y-auto/);
  });

  it("validates tenant identity before submitting", () => {
    assert.match(pageSource, /\^\[a-z0-9\]/);
    assert.match(pageSource, /Mã tenant chỉ gồm chữ thường/);
    assert.match(pageSource, /slugifyTenantName/);
  });
});
