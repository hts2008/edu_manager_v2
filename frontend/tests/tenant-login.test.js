import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  buildLoginPayload,
  isTenantAwareLoginEnabled,
  normalizeTenantSlug,
  normalizeTenancyMode,
} from "../src/services/authTenancy.js";

const loginPageSource = readFileSync(
  new URL("../src/pages/LoginPage.jsx", import.meta.url),
  "utf8",
);
const authContextSource = readFileSync(
  new URL("../src/context/AuthContext.jsx", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(
  new URL("../src/services/api.js", import.meta.url),
  "utf8",
);

describe("tenant-aware frontend login", () => {
  it("keeps legacy mode tenant-unaware, including unknown configuration values", () => {
    assert.equal(normalizeTenancyMode(undefined), "legacy");
    assert.equal(normalizeTenancyMode("unexpected"), "legacy");
    assert.equal(isTenantAwareLoginEnabled("legacy"), false);
    assert.deepEqual(buildLoginPayload("admin", "secret", undefined), {
      username: "admin",
      password: "secret",
    });
  });

  it("enables the tenant field only for dual-write and enforced modes", () => {
    assert.equal(normalizeTenancyMode(" DUAL_WRITE "), "dual_write");
    assert.equal(normalizeTenancyMode("ENFORCED"), "enforced");
    assert.equal(isTenantAwareLoginEnabled("dual_write"), true);
    assert.equal(isTenantAwareLoginEnabled("enforced"), true);
  });

  it("normalizes and sends tenant_slug without changing credentials", () => {
    assert.equal(normalizeTenantSlug("  HCM-Center  "), "hcm-center");
    assert.deepEqual(buildLoginPayload("Admin", "Secret", "  HCM-Center  "), {
      username: "Admin",
      password: "Secret",
      tenant_slug: "hcm-center",
    });
  });

  it("wires conditional UI through AuthContext into the API boundary", () => {
    assert.match(loginPageSource, /import\.meta\.env\.VITE_TENANCY_MODE/);
    assert.match(loginPageSource, /\{tenantAwareLogin && \(/);
    assert.match(loginPageSource, /id="tenant-slug"/);
    assert.match(loginPageSource, /tenantAwareLogin \? normalizedTenantSlug : undefined/);
    assert.match(authContextSource, /login = async \(username, password, tenantSlug\)/);
    assert.match(authContextSource, /authService\.login\(username, password, tenantSlug\)/);
    assert.match(apiSource, /buildLoginPayload\(username, password, tenantSlug\)/);
  });

  it("fails closed when auth me cannot provide a permission-bearing user", () => {
    assert.match(authContextSource, /normalizeAuthenticatedUser/);
    assert.match(authContextSource, /Array\.isArray\(user\?\.permissions\)/);
    assert.match(authContextSource, /AUTH_PROFILE_UNAVAILABLE/);
    assert.doesNotMatch(authContextSource, /currentUser\.success \? currentUser\.data\.user : response\.data\.user/);
  });
});
