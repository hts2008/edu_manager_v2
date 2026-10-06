import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const singlePermissionEndpoints = {
  "server/api/activity-logs/index.ts": "audit_logs.view",
  "server/api/backups/index.ts": "backups.manage",
  "server/api/bulk-actions/index.ts": "bulk_actions.run",
  "server/api/import/students.ts": "imports.run",
  "server/api/monthly-fees/generate.ts": "monthly_fees.generate",
  "server/api/recycle-bin/index.ts": "recycle_bin.manage",
  "server/api/reports/advanced.ts": "reports.view",
  "server/api/reports/bi.ts": "reports.view",
  "server/api/reports/finance-dashboard.ts": "reports.view",
  "server/api/reports/financial.ts": "reports.view",
  "server/api/reports/student-fees.ts": "reports.view",
  "server/api/reports/student-progress.ts": "progress.view",
  "server/api/student-progress/pdf.ts": "progress.view",
  "server/api/student-progress/timeline.ts": "progress.view",
  "server/api/templates/[id]/set-default.ts": "templates.manage",
  "server/api/templates/upload-image.ts": "templates.manage",
  "server/api/users/[id]/index.ts": "users.manage",
  "server/api/users/[id]/reset-password.ts": "users.reset_password",
  "server/api/users/index.ts": "users.manage",
} as const;

const methodPermissionEndpoints = {
  "server/api/student-progress/daily.ts": {
    read: "progress.view",
    write: "progress.grade",
  },
  "server/api/student-progress/index.ts": {
    read: "progress.view",
    write: "progress.grade",
  },
} as const;

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("Admin Console T4.3 endpoint permission sweep", () => {
  it("maps every former single-role guard to the catalog permission", () => {
    for (const [path, permission] of Object.entries(singlePermissionEndpoints)) {
      const content = source(path);
      assert.match(
        content,
        new RegExp(`requirePermission\\(\\s*["']${permission}["']\\s*,\\s*handler\\s*\\)`),
        path,
      );
      assert.doesNotMatch(content, /requireAuth\(\s*handler\s*,\s*\[/, path);
    }
  });

  it("separates progress read and mutation permissions by HTTP method", () => {
    for (const [path, permissions] of Object.entries(methodPermissionEndpoints)) {
      const content = source(path);
      assert.match(content, new RegExp(`requirePermission\\(\\s*["']${permissions.read}["']`), path);
      assert.match(content, new RegExp(`requirePermission\\(\\s*["']${permissions.write}["']`), path);
      assert.match(content, /req\.method\s*===\s*["']GET["']/, path);
      assert.doesNotMatch(content, /requireAuth\(\s*handler\s*,\s*\[/, path);
    }
  });

  it("leaves no role-array exports in server API endpoints", () => {
    const paths = [
      ...Object.keys(singlePermissionEndpoints),
      ...Object.keys(methodPermissionEndpoints),
    ];
    for (const path of paths) {
      assert.doesNotMatch(
        source(path),
        /export\s+default\s+requireAuth\(\s*handler\s*,\s*\[/,
        path,
      );
    }
  });
});
