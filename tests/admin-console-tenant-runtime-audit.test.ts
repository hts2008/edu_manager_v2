import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

import {
  TENANT_RUNTIME_ALLOWLIST,
  auditTenantRuntime,
} from "../scripts/audit-tenant-runtime.js";

const rootDir = resolve(import.meta.dirname, "..");

test("tenant runtime allowlist is explicit, documented, and not stale", () => {
  const audit = auditTenantRuntime(rootDir);

  assert.equal(audit.staleAllowlist.length, 0);
  assert.ok(TENANT_RUNTIME_ALLOWLIST.length > 0);
  for (const entry of TENANT_RUNTIME_ALLOWLIST) {
    assert.doesNotMatch(entry.path, /[*?]/);
    assert.match(entry.owner, /^(auth|backup|cron|platform)$/);
    assert.ok(entry.reason.length >= 20);
    assert.ok(entry.followUp.length >= 8);
  }
});

test("tenant-aware Settings handlers use req.db without direct Prisma bypasses", () => {
  const audit = auditTenantRuntime(rootDir);
  const settings = audit.files.filter(
    (file) => file.path.startsWith("server/api/admin/settings/") && file.protectedHandler,
  );

  assert.deepEqual(
    settings.map((file) => file.path).sort(),
    [
      "server/api/admin/settings/[key].ts",
      "server/api/admin/settings/[key]/revisions.ts",
      "server/api/admin/settings/[key]/rollback.ts",
      "server/api/admin/settings/index.ts",
      "server/api/admin/settings/simulate.ts",
    ],
  );
  assert.ok(settings.every((file) => file.usesRequestDb));
  assert.ok(settings.every((file) => !file.directPrismaImport));
  assert.ok(settings.every((file) => file.findings.length === 0));
});

test("audit reports exactly the non-allowlisted handlers that bypass req.db", () => {
  const audit = auditTenantRuntime(rootDir);
  const bypasses = audit.findings.filter((finding) => finding.code === "TENANT_DB_BYPASS");

  assert.equal(bypasses.length, audit.summary.blockingFindings);
  for (const finding of bypasses) {
    const file = audit.files.find((entry) => entry.path === finding.path);
    assert.ok(file?.directPrismaImport, finding.path);
    assert.equal(file?.allowlist, undefined, finding.path);
  }
  assert.equal(bypasses.some((finding) => finding.path === "server/api/auth/login.ts"), false);
});

test("raw SQL in API handlers is rejected unless the exact file is allowlisted for raw SQL", () => {
  const audit = auditTenantRuntime(rootDir);
  for (const file of audit.files.filter((item) => item.rawSql)) {
    assert.ok(
      file.allowlist?.capabilities.includes("raw_sql"),
      `${file.path} uses raw SQL without an exact raw_sql exception`,
    );
  }
});

test("CLI status mirrors the machine-readable audit result", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/audit-tenant-runtime.ts", "--json"],
    { cwd: rootDir, encoding: "utf8" },
  );

  const output = JSON.parse(result.stdout) as ReturnType<typeof auditTenantRuntime>;
  assert.equal(result.status, output.ok ? 0 : 1, result.stderr);
  assert.equal(output.summary.blockingFindings, output.findings.length);
  assert.equal(output.summary.staleAllowlist, 0);
});
