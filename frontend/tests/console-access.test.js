import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const pageSource = readFileSync(
  new URL("../src/console/AccessPage.jsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(new URL("../src/services/api.js", import.meta.url), "utf8");
const protectedRouteSource = readFileSync(new URL("../src/components/layout/ProtectedRoute.jsx", import.meta.url), "utf8");
const permissionApiSource = readFileSync(new URL("../../server/api/admin/permissions.ts", import.meta.url), "utf8");

describe("Admin Console access matrix", () => {
  it("uses the tenant permission GET and PUT API contract", () => {
    assert.match(apiSource, /get: \(options = \{\}\) => request\("\/admin\/permissions", options\)/);
    assert.match(apiSource, /update: \(data\) => request\("\/admin\/permissions", \{ method: "PUT", body: JSON\.stringify\(data\) \}\)/);
    assert.match(permissionApiSource, /export default requirePermission\("console\.access\.edit", handler\)/);
    assert.match(pageSource, /adminPermissionsService/);
    assert.match(pageSource, /permission_key/);
    assert.doesNotMatch(pageSource, /fetch\(/);
  });

  it("renders and persists tenant security settings through the shared settings client", () => {
    assert.match(pageSource, /settingsService = adminSettingsService/);
    assert.match(pageSource, /settingsService\.getAll\(\{ group: "access" \}/);
    assert.match(pageSource, /SettingEditorCard/);
    assert.match(pageSource, /Chính sách bảo mật/);
    assert.match(pageSource, /settingsService\.update/);
  });

  it("renders loading, error, empty and populated states", () => {
    assert.match(pageSource, /<AsyncBoundary/);
    assert.match(pageSource, /Đang tải ma trận quyền/);
    assert.match(pageSource, /Không tải được ma trận quyền/);
    assert.match(pageSource, /Chưa có quyền nào được cấu hình/);
    assert.match(pageSource, /Ma trận phân quyền/);
  });

  it("groups permissions by domain and renders roles as matrix columns", () => {
    assert.match(pageSource, /groupPermissionsByDomain/);
    assert.match(pageSource, /DOMAIN_LABELS/);
    assert.match(pageSource, /roles\.map/);
    assert.match(pageSource, /permissions\.map/);
    assert.match(pageSource, /overflow-x-auto/);
    assert.match(pageSource, /min-w-\[760px\]/);
  });

  it("provides optimistic-safe toggles with per-cell pending and rollback", () => {
    assert.match(pageSource, /setPendingCell/);
    assert.match(pageSource, /previousMatrix/);
    assert.match(pageSource, /setMatrix\(previousMatrix\)/);
    assert.match(pageSource, /aria-checked/);
    assert.match(pageSource, /Đang lưu quyền/);
  });

  it("prevents administrators from locking themselves out", () => {
    assert.match(pageSource, /PROTECTED_ADMIN_PERMISSIONS/);
    assert.match(pageSource, /console\.access/);
    assert.match(pageSource, /console\.access\.edit/);
    assert.match(pageSource, /Quyền bắt buộc để tránh khóa Admin Console/);
  });

  it("guards every Admin Console child route with its manifest permission", () => {
    const guardedRoutes = {
      organization: "console.organization.view",
      academic: "console.academic.edit",
      finance: "console.finance.edit",
      access: "console.access.edit",
      integrations: "console.integrations.edit",
      system: "console.access",
    };

    for (const [path, permission] of Object.entries(guardedRoutes)) {
      assert.match(
        appSource,
        new RegExp(
          `path="${path}" element={<RequirePermission permission="${permission.replaceAll(".", "\\.")}">`,
        ),
      );
    }
  });

  it("guards operational routes with the same permission catalog used by the sidebar", () => {
    const guardedRoutes = {
      students: "students.manage",
      parents: "students.manage",
      classes: "classes.manage",
      attendance: "attendance.manage",
      "attendance-insights": "attendance.manage",
      "attendance-periods": "attendance.manage",
      receipts: "receipts.manage",
      "fee-collection": "fees.collect",
      history: "receipts.manage",
      "student-progress": "progress.view",
    };
    for (const [path, permission] of Object.entries(guardedRoutes)) {
      const route = appSource.split("\n").find((line) => line.includes(`path="${path}"`));
      assert.ok(route, `Missing route ${path}`);
      assert.ok(route.includes(`<RequirePermission permission="${permission}">`), `${path} must require ${permission}`);
      assert.match(route, /<\/RequirePermission>\)}/);
    }
    assert.match(appSource, /<ProtectedRoute requiredPermission=\{permission\}>\{children\}<\/ProtectedRoute>/);
    assert.match(protectedRouteSource, /if \(!isAuthenticated\)/);
    assert.match(protectedRouteSource, /requiredPermission && !hasPermission\(requiredPermission\)/);
  });

  it("keeps tenant lifecycle direct URLs exclusive to Platform Owners", () => {
    assert.match(appSource, /const RequirePlatformOwner/);
    assert.match(appSource, /is_platform_owner/);
    assert.match(
      appSource,
      /path="tenants" element={<RequirePlatformOwner><TenantsPage \/><\/RequirePlatformOwner>}/,
    );
  });
});
