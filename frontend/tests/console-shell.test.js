import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  consoleNavigation,
  filterConsoleNavigation,
  getConsoleNavigation,
} from "../src/console/consoleManifest.js";

const layoutSource = readFileSync(new URL("../src/console/ConsoleLayout.jsx", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../src/console/ConsoleHomePage.jsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

describe("Admin Console shell", () => {
  it("defines unique routes, ids, and permissions in one manifest", () => {
    assert.equal(new Set(consoleNavigation.map((item) => item.id)).size, consoleNavigation.length);
    assert.equal(new Set(consoleNavigation.map((item) => item.path)).size, consoleNavigation.length);
    assert.ok(consoleNavigation.every((item) => item.permission));
    assert.deepEqual(consoleNavigation.map((item) => item.label), [
      "Giao diện", "Tổng quan", "Trung tâm", "Tổ chức", "Học thuật", "Tài chính", "Người dùng & Quyền", "Tích hợp", "Hệ thống",
    ]);
  });

  it("keeps tenant lifecycle navigation exclusive to Platform Owners", () => {
    assert.equal(getConsoleNavigation().some((item) => item.id === "tenants"), false);
    assert.equal(getConsoleNavigation({ isPlatformOwner: true }).some((item) => item.id === "tenants"), true);
  });

  it("searches labels, descriptions, terms, and permission metadata", () => {
    const permissions = consoleNavigation
      .filter((item) => !item.platformOnly)
      .map((item) => item.permission);
    const options = { permissions };
    assert.deepEqual(filterConsoleNavigation("học phí", options).map((item) => item.id), ["finance"]);
    assert.deepEqual(filterConsoleNavigation("console.academic.edit", options).map((item) => item.id), ["academic"]);
    assert.deepEqual(filterConsoleNavigation("tenant").map((item) => item.id), []);
    assert.deepEqual(filterConsoleNavigation("tenant", { isPlatformOwner: true }).map((item) => item.id), ["tenants"]);
  });

  it("provides responsive and accessible console navigation", () => {
    assert.match(layoutSource, /aria-label="Điều hướng Admin Console"/);
    assert.match(layoutSource, /role="dialog"/);
    assert.match(layoutSource, /aria-modal="true"/);
    assert.match(layoutSource, /aria-live="polite"/);
    assert.match(layoutSource, /useReducedMotion/);
    assert.match(layoutSource, /min-w-0 flex-1/);
  });

  it("renders honest loading, error, and empty states without API or mock coupling", () => {
    assert.match(homeSource, /<AsyncBoundary/);
    assert.match(homeSource, /errorTitle="Không tải được Admin Console"/);
    assert.match(homeSource, /title="Chưa có dữ liệu cấu hình"/);
    assert.match(homeSource, /summary = null/);
    assert.doesNotMatch(homeSource, /services\/api|fetch\(|axios|mock/i);
  });

  it("registers a guarded admin route group instead of falling through", () => {
    assert.match(appSource, /path="\/admin"/);
    assert.match(appSource, /<ProtectedRoute requiredPermission="console\.access">/);
    assert.match(appSource, /path="tenants" element={<RequirePlatformOwner><TenantsPage \/><\/RequirePlatformOwner>}/);
    assert.match(appSource, /path="finance" element={<RequirePermission permission="console\.finance\.edit"><ConsoleSettingsPage \/><\/RequirePermission>}/);
  });
});
