import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL(
    "../prisma/migrations/20260712_tuition_v3_session_ledger/migration.sql",
    import.meta.url,
  ),
  "utf8",
);
const backfill = readFileSync(
  new URL("../scripts/backfill-class-sessions.ts", import.meta.url),
  "utf8",
);

describe("Tuition V3 additive migration", () => {
  it("defines the billing policy, session ledger, fee audit, and immutable revisions", () => {
    assert.match(schema, /enum BillingPolicy[\s\S]*monthly_prorated[\s\S]*per_session/);
    assert.match(schema, /model ClassSession\s*\{/);
    assert.match(schema, /enum ClassSessionKind[\s\S]*regular[\s\S]*makeup[\s\S]*extra/);
    assert.match(schema, /enum ClassSessionStatus[\s\S]*planned[\s\S]*held[\s\S]*cancelled[\s\S]*holiday/);
    assert.match(schema, /enum ExtraFeeMode[\s\S]*included[\s\S]*surcharge/);
    assert.match(schema, /@@unique\(\[classId, sessionDate\]\)/);
    assert.match(schema, /billingMonth\s+String\s+@map\("billing_month"\)/);
    assert.match(schema, /@@index\(\[classId, billingMonth, status\]\)/);
    assert.match(schema, /replacementFor\s+ClassSession\?/);
    assert.match(schema, /classSessionId\s+String\?/);
    for (const field of [
      "contractSessions",
      "eligibleSessions",
      "deliveredSessions",
      "centerCreditSessions",
      "studentWaivedSessions",
    ]) {
      assert.match(schema, new RegExp(`${field}\\s+Int`));
    }
    assert.match(
      schema,
      /calculationVersion\s+String\s+@default\("tuition-v2-legacy"\)/,
    );
    assert.match(schema, /calculationSnapshot\s+Json\?/);
    assert.match(schema, /model MonthlyFeeLineRevision\s*\{/);
    assert.match(schema, /runId\s+String/);
    assert.match(schema, /beforeSnapshot\s+Json\?/);
    assert.match(schema, /afterSnapshot\s+Json/);
  });

  it("backfills policies and sessions, classifies all-holiday dates, and attaches attendance", () => {
    assert.match(migration, /UPDATE "classes"[\s\S]*"billing_policy"/i);
    assert.match(migration, /INSERT INTO "class_sessions"/i);
    assert.match(migration, /bool_and\([^)]*"status"\s*=\s*'holiday'/i);
    assert.match(migration, /to_char\([^\n]*'YYYY-MM'/i);
    assert.match(migration, /THEN 'holiday'::"ClassSessionStatus"/i);
    assert.match(migration, /UPDATE "attendance"[\s\S]*"class_session_id"/i);
    assert.match(migration, /ON CONFLICT \("class_id", "session_date"\) DO NOTHING/i);
  });

  it("never rewrites protected fee rows", () => {
    assert.doesNotMatch(migration, /UPDATE\s+"monthly_fee_lines"/i);
    assert.doesNotMatch(migration, /DELETE\s+FROM\s+"monthly_fee_lines"/i);
    assert.match(migration, /prevent_monthly_fee_line_revision_mutation/i);
  });

  it("keeps the operator backfill dry-run by default and reports low-confidence rows", () => {
    assert.match(backfill, /process\.argv\.includes\("--apply"\)/);
    assert.match(backfill, /mode:\s*apply\s*\?\s*"apply"\s*:\s*"dry-run"/);
    assert.match(backfill, /lowConfidence/i);
  });
});
