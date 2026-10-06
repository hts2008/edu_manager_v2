import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  buildTuitionSettingsContext,
  resolveExtraSessionAmount,
} from "../lib/tuition-settings.js";
import {
  CHARGEABLE_ATTENDANCE_STATUSES,
  DEFAULT_MAKE_UP_REASON,
  DEFAULT_WEEKLY_SESSION_DAYS,
  calculateTuitionForClass,
  resolveAttendanceSessionPolicy,
} from "../lib/tuition.js";
import { calculateTuitionV3 } from "../lib/tuition-v3.js";

describe("finance settings tuition adapter", () => {
  it("loads tenant-effective finance settings for attendance fee calculation", () => {
    const api = readFileSync(
      new URL("../server/api/attendance/calculate-fee.ts", import.meta.url),
      "utf8",
    );
    const calculator = readFileSync(
      new URL("../lib/finance-corrections.ts", import.meta.url),
      "utf8",
    );

    assert.match(api, /loadTuitionSettings/);
    assert.match(api, /tenantId:\s*requireTenantId\(req\)/);
    assert.match(api, /effectiveMonth:\s*month/);
    assert.match(api, /calculateStudentMonthlyFee\([\s\S]*?tenantId[\s\S]*?settings/);
    assert.match(calculator, /const tenantScope = options\.tenantId \? \{ tenantId: options\.tenantId \} : \{\}/);
    assert.match(calculator, /where:\s*\{\s*id:\s*studentId,\s*deletedAt:\s*null,\s*\.\.\.tenantScope/);
    assert.match(calculator, /classSession\.findMany\([\s\S]*?where:\s*\{\s*\.\.\.tenantScope/);
    assert.match(calculator, /attendance\.findMany\([\s\S]*?where:\s*\{\s*\.\.\.tenantScope/);
    assert.match(calculator, /settings:\s*options\.settings/);
  });

  it("preserves every current tuition default when no tenant override exists", () => {
    const context = buildTuitionSettingsContext();

    assert.deepEqual(context.chargeableStatuses, CHARGEABLE_ATTENDANCE_STATUSES);
    assert.deepEqual(context.defaultSessionDays, DEFAULT_WEEKLY_SESSION_DAYS);
    assert.equal(context.extraSessionPolicy, "derive_monthly");
    assert.equal(context.makeUpDefaultReason, DEFAULT_MAKE_UP_REASON);

    const legacy = calculateTuitionForClass(
      { feePerDay: 900_000, sessionsPerWeek: 2 },
      "2026-06",
      8,
    );
    const configured = calculateTuitionForClass(
      { feePerDay: 900_000, sessionsPerWeek: 2 },
      "2026-06",
      8,
      context,
    );
    assert.deepEqual(configured, legacy);
  });

  it("validates and applies tenant finance overrides without mutating registry defaults", () => {
    const context = buildTuitionSettingsContext({
      "finance.chargeable_statuses": ["present"],
      "finance.default_session_days": [1, 3, 5],
      "finance.extra_session_policy": "per_session_fee",
      "finance.makeup_default_reason": "Hoc bu theo cau hinh",
    });

    assert.deepEqual(context.chargeableStatuses, ["present"]);
    assert.deepEqual(context.defaultSessionDays, [1, 3, 5]);
    assert.equal(context.extraSessionPolicy, "per_session_fee");
    assert.equal(context.makeUpDefaultReason, "Hoc bu theo cau hinh");
    assert.throws(
      () => buildTuitionSettingsContext({ "finance.default_session_days": [0, 7] }),
      /too_small|too_big/i,
    );
  });

  it("uses configured default weekdays and makeup reason in the legacy engine", () => {
    const context = buildTuitionSettingsContext({
      "finance.default_session_days": [1, 3, 5],
      "finance.makeup_default_reason": "Hoc bu da duyet",
    });
    const result = calculateTuitionForClass(
      { feePerDay: 900_000, sessionsPerWeek: 3 },
      "2026-06",
      12,
      context,
    );
    const policy = resolveAttendanceSessionPolicy(
      { scheduleDays: ["T4", "T6"] },
      "2026-06-02",
      { settings: context },
    );

    assert.equal(result.expectedSessions, 13);
    assert.equal(policy.offSchedule, true);
    assert.equal(policy.makeUpReason, "Hoc bu da duyet");
  });

  it("uses configured chargeable statuses in the session-ledger engine", () => {
    const context = buildTuitionSettingsContext({
      "finance.chargeable_statuses": ["present"],
    });
    const result = calculateTuitionV3({
      month: "2026-06",
      plan: { mode: "per_session", sessionAmount: 100_000 },
      settings: context,
      slots: [
        { id: "present", date: "2026-06-01", kind: "regular", status: "present" },
        { id: "absent", date: "2026-06-03", kind: "regular", status: "absent_with_fee" },
      ],
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.summary.chargedRegularSlots, 1);
    assert.equal(result.totalAmount, 100_000);
    assert.equal(result.ledger.find((row) => row.id === "absent")?.disposition, "not_chargeable");
  });

  it("adapts extra-session amount while keeping the current derivation as default", () => {
    const defaults = buildTuitionSettingsContext();
    const perSession = buildTuitionSettingsContext({
      "finance.extra_session_policy": "per_session_fee",
    });

    assert.equal(resolveExtraSessionAmount(defaults, {
      billingMode: "monthly_prorated",
      monthlyAmount: 900_000,
      plannedRegularSlots: 9,
      perSessionFee: 120_000,
    }), 100_000);
    assert.equal(resolveExtraSessionAmount(perSession, {
      billingMode: "monthly_prorated",
      monthlyAmount: 900_000,
      plannedRegularSlots: 9,
      perSessionFee: 120_000,
    }), 120_000);
  });
});
