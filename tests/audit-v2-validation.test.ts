import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attendanceBulkSchema,
  attendancePeriodActionSchema,
  bulkFeePaymentSchema,
  classMonthPlanPatchSchema,
  classMonthPlanReplaceSchema,
  monthlyFeePaySchema,
  validateBody,
} from "../lib/validation.js";

function assertValidationError(run: () => unknown) {
  assert.throws(run, (error: any) => {
    assert.equal(error?.code, "VALIDATION_ERROR");
    assert.equal(error?.status, 400);
    return true;
  });
}

describe("Audit V2 mutation validation", () => {
  it("accepts object payment payloads and rejects the removed raw-string shortcut", () => {
    assert.deepEqual(validateBody(monthlyFeePaySchema, { payment_method: "cash" }), {
      payment_method: "cash",
    });
    assertValidationError(() => validateBody(monthlyFeePaySchema, "cash"));
  });

  it("bounds bulk fee selections and validates calendar months", () => {
    const valid = validateBody(bulkFeePaymentSchema, {
      line_ids: ["line-1", "line-2"],
      month: "2026-08",
      payment_method: "transfer",
    });
    assert.equal(valid.line_ids.length, 2);
    assertValidationError(() => validateBody(bulkFeePaymentSchema, {
      line_ids: ["line-1"],
      month: "2026-13",
      payment_method: "cash",
    }));
    assertValidationError(() => validateBody(bulkFeePaymentSchema, {
      line_ids: Array.from({ length: 501 }, (_, index) => `line-${index}`),
      month: "2026-08",
      payment_method: "cash",
    }));
  });

  it("validates attendance replacement payloads before database work", () => {
    const valid = validateBody(attendanceBulkSchema, {
      class_id: "class-1",
      dates: ["2026-08-03"],
      records: [{
        student_id: "student-1",
        class_id: "class-1",
        attendance_date: "2026-08-03",
        status: "present",
      }],
      replacement_scope: [{ student_id: "student-1", attendance_date: "2026-08-03" }],
    });
    assert.equal(valid.records[0].status, "present");
    assertValidationError(() => validateBody(attendanceBulkSchema, {
      class_id: "class-1",
      dates: ["2026-02-30"],
      records: [],
    }));
    assertValidationError(() => validateBody(attendanceBulkSchema, {
      class_id: "class-1",
      dates: ["2026-08-03"],
      records: [{ attendance_date: "2026-08-03", status: "present" }],
    }));
  });

  it("requires reasons only for attendance reopen actions", () => {
    assert.equal(validateBody(attendancePeriodActionSchema, { action: "submit" }).action, "submit");
    assert.equal(
      validateBody(attendancePeriodActionSchema, {
        action: "reopen-for-correction",
        reason: "Sửa dữ liệu điểm danh sai",
      }).action,
      "reopen-for-correction",
    );
    assertValidationError(() => validateBody(attendancePeriodActionSchema, {
      action: "reopen-for-correction",
      reason: " ",
    }));
    assertValidationError(() => validateBody(attendancePeriodActionSchema, { action: "unknown" }));
  });

  it("accepts current frontend month-plan snapshots and rejects malformed plans", () => {
    const replace = validateBody(classMonthPlanReplaceSchema, {
      class_id: "class-1",
      month: "2026-08",
      expected_version: 2,
      row_versions: { "session-1": 4 },
      schedule_mode: "fixed_weekdays",
      weekdays: [1, 3, 5],
      sessions_per_week: 3,
      reason: "Điều chỉnh lịch tháng",
    });
    assert.equal(replace.expected_version, 2);

    const patch = validateBody(classMonthPlanPatchSchema, {
      class_id: "class-1",
      month: "2026-08",
      expected_version: 2,
      row_versions: { "session-1": 4 },
      schedule_mode: "flexible",
      add_sessions: [{
        session_date: "2026-08-10",
        billing_month: "2026-08",
        kind: "regular",
        status: "planned",
      }],
      remove_session_ids: ["session-1"],
      reason: "Đổi ngày học",
    });
    assert.equal(patch.add_sessions.length, 1);

    assertValidationError(() => validateBody(classMonthPlanReplaceSchema, {
      class_id: "class-1",
      month: "2026-13",
      expected_version: -1,
      schedule_mode: "fixed_weekdays",
      weekdays: [],
      reason: "x",
    }));
    assertValidationError(() => validateBody(classMonthPlanPatchSchema, {
      class_id: "class-1",
      month: "2026-08",
      expected_version: 1,
      reason: "Không có thay đổi",
    }));
  });
});
