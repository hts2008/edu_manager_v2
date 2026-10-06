import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertTenantIdentity,
  getTenancyMode,
  resolveEffectiveTenantId,
  resolveLoginTenantSlug,
} from "../lib/tenancy.js";

describe("Admin Console tenant auth policy", () => {
  it("defaults to legacy mode until the release gate explicitly advances", () => {
    assert.equal(getTenancyMode({}), "legacy");
    assert.equal(getTenancyMode({ TENANCY_MODE: "dual_write" }), "dual_write");
    assert.equal(getTenancyMode({ TENANCY_MODE: "enforced" }), "enforced");
    assert.throws(() => getTenancyMode({ TENANCY_MODE: "unsafe" }), /Invalid TENANCY_MODE/);
  });

  it("uses the deterministic tenant only during the compatibility window", () => {
    assert.equal(resolveLoginTenantSlug(undefined, "legacy"), null);
    assert.equal(resolveLoginTenantSlug(undefined, "dual_write"), "default");
    assert.equal(resolveLoginTenantSlug(" Center-A ", "dual_write"), "center-a");
    assert.throws(
      () => resolveLoginTenantSlug(undefined, "enforced"),
      /tenant_slug is required/,
    );
  });

  it("requires token, session and subject tenancy to match after enforcement", () => {
    assert.doesNotThrow(() =>
      assertTenantIdentity({
        mode: "enforced",
        tokenTenantId: "tenant-a",
        sessionTenantId: "tenant-a",
        subjectTenantId: "tenant-a",
      }),
    );
    assert.throws(
      () =>
        assertTenantIdentity({
          mode: "enforced",
          tokenTenantId: "tenant-a",
          sessionTenantId: "tenant-a",
          subjectTenantId: "tenant-b",
        }),
      /Tenant identity mismatch/,
    );
    assert.throws(
      () =>
        assertTenantIdentity({
          mode: "enforced",
          tokenTenantId: undefined,
          sessionTenantId: "tenant-a",
          subjectTenantId: "tenant-a",
        }),
      /Tenant identity is required/,
    );
  });

  it("keeps legacy sessions valid only before enforced cutover", () => {
    assert.doesNotThrow(() =>
      assertTenantIdentity({
        mode: "legacy",
        tokenTenantId: undefined,
        sessionTenantId: null,
        subjectTenantId: null,
      }),
    );
    assert.doesNotThrow(() =>
      assertTenantIdentity({
        mode: "dual_write",
        tokenTenantId: undefined,
        sessionTenantId: null,
        subjectTenantId: null,
      }),
    );
  });

  it("resolves a tenant context for new dual-write sessions before user backfill", () => {
    assert.equal(
      resolveEffectiveTenantId({
        mode: "dual_write",
        tokenTenantId: "tenant_default",
        sessionTenantId: "tenant_default",
        subjectTenantId: null,
      }),
      "tenant_default",
    );
    assert.equal(
      resolveEffectiveTenantId({
        mode: "dual_write",
        tokenTenantId: undefined,
        sessionTenantId: null,
        subjectTenantId: null,
      }),
      null,
    );
  });
});
