import assert from "node:assert/strict";
import { it } from "node:test";
import { buildStudentTuitionV3 } from "../lib/tuition-v3-service.js";
import { buildTuitionSettingsContext } from "../lib/tuition-settings.js";

function calculate(mode = "per_session", rate: number | null = 90_000, count = 1,
  extraMode = "surcharge", policy = "derive_monthly", outside = false) {
  const sessions = Array.from({ length: count }, (_, index) => ({
    id: `regular-${index}`, classId: "class", sessionDate: `2026-06-${String(index + 1).padStart(2, "0")}`,
    kind: "regular", status: "held", extraFeeMode: "included",
  }));
  sessions.push({ id: "extra", classId: "class", sessionDate: "2026-06-30",
    kind: "extra", status: "held", extraFeeMode: extraMode });
  if (outside) sessions.push({ id: "outside", classId: "class", sessionDate: "2026-07-01",
    kind: "regular", status: "held", extraFeeMode: "included" });
  return buildStudentTuitionV3({
    month: "2026-06", classData: { id: "class", billingPolicy: mode, feePerDay: rate },
    enrollment: {}, sessions,
    attendance: sessions.map((session) => ({ classSessionId: session.id,
      attendanceDate: session.sessionDate, status: "present" })),
    settings: buildTuitionSettingsContext({ "finance.extra_session_policy": policy }),
  });
}

for (const policy of ["derive_monthly", "per_session_fee"]) {
  it(`per_session regular plus surcharge is 180k under ${policy}`, () => {
    const result = calculate("per_session", 90_000, 1, "surcharge", policy);
    assert.equal(result.amount, 180_000);
    assert.equal(result.calculationSnapshot.summary.chargedExtraSlots, 1);
  });
  it(`included extra remains 90k under ${policy}`, () => {
    assert.equal(calculate("per_session", 90_000, 1, "included", policy).amount, 90_000);
  });
}
it("monthly 900k/10 plus surcharge is 990k", () => {
  assert.equal(calculate("monthly_prorated", 900_000, 10).amount, 990_000);
});
it("monthly included extra remains 900k", () => {
  assert.equal(calculate("monthly_prorated", 900_000, 10, "included").amount, 900_000);
});
it("monthly denominator excludes regular slots outside billing month", () => {
  assert.equal(calculate("monthly_prorated", 900_000, 10, "surcharge", "derive_monthly", true).amount, 990_000);
});
it("preserves monthly remainder and aggregate extra rounding", () => {
  const result = calculate("monthly_prorated", 1_000_001, 3);
  assert.equal(result.amount, 1_333_335);
  assert.deepEqual(result.calculationSnapshot.ledger.filter((row) => row.kind === "regular")
    .map((row) => row.amount), [333_334, 333_334, 333_333]);
});
it("rejects monthly surcharge without regular slots", () => {
  assert.throws(() => calculate("monthly_prorated", 900_000, 0),
    (error: any) => error.code === "ZERO_PLANNED_REGULAR_SLOTS");
});
it("rejects monthly per_session_fee without independent session rate", () => {
  assert.throws(() => calculate("monthly_prorated", 900_000, 10, "surcharge", "per_session_fee"),
    (error: any) => error.code === "EXTRA_SESSION_RATE_REQUIRED");
});
it("included monthly extras need no independent surcharge rate", () => {
  assert.equal(calculate("monthly_prorated", 900_000, 10, "included", "per_session_fee").amount, 900_000);
});
for (const rate of [null, NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
  it(`rejects invalid monthly amount ${String(rate)}`, () => {
    assert.throws(() => calculate("monthly_prorated", rate, 10),
      (error: any) => error.code === "INVALID_TUITION_AMOUNT");
  });
}
it("explicit free surcharge keeps its surcharge disposition", () => {
  const result = calculate("per_session", 0);
  assert.equal(result.amount, 0);
  assert.equal(result.calculationSnapshot.ledger.find((row) => row.id === "extra")?.disposition, "surcharged_extra");
});
it("rejects a total exceeding safe integer VND", () => {
  assert.throws(() => calculate("per_session", Number.MAX_SAFE_INTEGER),
    (error: any) => error.code === "INVALID_TUITION_AMOUNT");
});
