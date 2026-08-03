import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  studentProgressDailyDeleteSchema,
  studentProgressDailyQuerySchema,
  studentProgressDailyPutSchema,
} from "../lib/validation.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const dailyApi = source("server/api/student-progress/daily.ts");
const monthlyApi = source("server/api/student-progress/index.ts");
const prismaSchema = source("prisma/schema.prisma");
const router = source("api/router.ts");

describe("daily student progress API contract", () => {
  it("allows admin and receptionist for daily GET, PUT, and DELETE", () => {
    assert.match(dailyApi, /if \(req\.method === "GET"\) return listDailyEntries\(req, res\)/);
    assert.match(dailyApi, /if \(req\.method === "PUT"\) return replaceDailyEntries\(req, res\)/);
    assert.match(dailyApi, /if \(req\.method === "DELETE"\) return deleteDailyEntries\(req, res\)/);
    assert.match(
      dailyApi,
      /export default requireAuth\(handler,\s*\["admin",\s*"receptionist"\]\)/
    );
    assert.doesNotMatch(dailyApi, /api\/router/);
    assert.match(router, /studentProgressDaily/);
    assert.match(
      router,
      /exact\(parts,\s*\["student-progress",\s*"daily"\],\s*routes\.studentProgressDaily\)/,
    );
  });

  it("replaces and deletes only the selected date before recomputing the month", () => {
    assert.match(
      dailyApi,
      /studentProgressDailyEntry\.deleteMany\(\{\s*where:\s*\{\s*progressMonthId:\s*progressMonth\.id,\s*entryDate/
    );
    assert.match(dailyApi, /studentProgressDailyEntry\.createMany/);
    assert.match(dailyApi, /recomputeMonthlyRollup\(tx,\s*progressMonth/);
    assert.match(dailyApi, /isolationLevel:\s*"Serializable"/);
    assert.doesNotMatch(
      monthlyApi,
      /studentProgressDailyEntry\.deleteMany|studentProgressDailyEntry\.createMany/
    );
  });

  it("rejects legacy daily_entries on the monthly write endpoint", () => {
    assert.match(monthlyApi, /"DAILY_ENTRY_API_REQUIRED"/);
    assert.match(monthlyApi, /daily_entries|dailyEntries/);
    assert.match(monthlyApi, /409/);
    assert.match(monthlyApi, /source\?\.source === "daily_rollup"/);
    assert.match(monthlyApi, /"teacher_input"/);
  });

  it("adds the additive entry enum and date lookup index", () => {
    assert.match(
      prismaSchema,
      /enum ProgressEntryType\s*\{[\s\S]*skill_assessment[\s\S]*\}/
    );
    assert.match(
      prismaSchema,
      /@@index\(\[progressMonthId,\s*entryDate\]\)/
    );
  });

  it("requires a note only when attendance context confirms a non-attendance date", () => {
    assert.match(dailyApi, /attendanceContextAvailable/);
    assert.match(dailyApi, /"NON_ATTENDANCE_NOTE_REQUIRED"/);
    assert.match(dailyApi, /attendance.*findFirst|attendance.*findMany/s);
  });

  it("keeps teacher-authored monthly skills separate from daily rollup metrics", () => {
    assert.match(dailyApi, /source:\s*DAILY_ROLLUP_SOURCE/);
    assert.match(dailyApi, /studentProgressSkill\.deleteMany/);
    assert.doesNotMatch(dailyApi, /studentProgressSkill\.upsert/);
    assert.match(dailyApi, /resolveMonthlyProgressScore/);
    assert.doesNotMatch(monthlyApi, /dailyRollupSkills/);
  });

  it("accepts grader attribution only for the active teacher assigned to the class", () => {
    assert.match(dailyApi, /GRADER_NOT_ASSIGNED/);
    assert.match(dailyApi, /enrollment\.class\.teacherId/);
    assert.match(dailyApi, /enrollment\.class\.teacher\?\.status/);
  });
});

describe("daily student progress validation", () => {
  it("accepts GET by month or selected date", () => {
    assert.equal(
      studentProgressDailyQuerySchema.safeParse({
        student_id: "student-1",
        class_id: "class-1",
        month: "2026-06",
      }).success,
      true
    );
    assert.equal(
      studentProgressDailyQuerySchema.safeParse({
        student_id: "student-1",
        class_id: "class-1",
        entry_date: "2026-06-13",
      }).success,
      true
    );
  });

  it("accepts a date replacement with skill assessments and context note", () => {
    const result = studentProgressDailyPutSchema.safeParse({
      student_id: "student-1",
      class_id: "class-1",
      entry_date: "2026-06-13",
      note: "Extra practice outside the attendance schedule",
      entries: [
        {
          entry_type: "skill_assessment",
          skill_key: "listening",
          score: 82,
          difficulty_level: "ket",
          entry_label: "KET listening practice 1",
          graded_by_teacher_id: "cm1234567890abcdef",
        },
        {
          entry_type: "daily_practice",
          score: null,
        },
      ],
    });

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.entries[0]?.difficulty_level, "ket");
    assert.equal(result.data.entries[0]?.entry_label, "KET listening practice 1");
    assert.equal(result.data.entries[0]?.graded_by_teacher_id, "cm1234567890abcdef");
  });

  it("enforces the immutable enrollment period before replacing daily evidence", () => {
    assert.match(dailyApi, /assertAttendanceWriteEnrollment/);
    assert.match(dailyApi, /attendanceDate:\s*entryDate/);
  });

  it("rejects unsupported difficulty, oversized labels, and invalid grader ids", () => {
    const base = {
      student_id: "student-1",
      class_id: "class-1",
      entry_date: "2026-06-13",
      entries: [{ entry_type: "daily_practice", score: 80 }],
    };
    const invalid = [
      { ...base, entries: [{ ...base.entries[0], difficulty_level: "ielts" }] },
      { ...base, entries: [{ ...base.entries[0], entry_label: "x".repeat(201) }] },
      { ...base, entries: [{ ...base.entries[0], graded_by_teacher_id: "not-a-cuid" }] },
    ];

    for (const payload of invalid) {
      assert.equal(studentProgressDailyPutSchema.safeParse(payload).success, false);
    }
  });

  it("maps new daily metadata to snake_case DTOs, writes, and revision snapshots", () => {
    for (const mapping of [
      /difficulty_level:\s*entry\.difficultyLevel/,
      /entry_label:\s*entry\.entryLabel/,
      /graded_by_teacher_id:\s*entry\.gradedByTeacherId/,
    ]) {
      assert.match(dailyApi, mapping);
      assert.match(monthlyApi, mapping);
    }
    for (const mapping of [
      /difficultyLevel:\s*entry\.difficulty_level/,
      /entryLabel:\s*entry\.entry_label/,
      /gradedByTeacherId:\s*entry\.graded_by_teacher_id/,
    ]) {
      assert.match(dailyApi, mapping);
    }
  });

  it("rejects invalid dates, missing selectors, and malformed assessments", () => {
    const invalidQueries = [
      { student_id: "student-1", class_id: "class-1" },
      { student_id: "student-1", class_id: "class-1", month: "2026-6" },
      { student_id: "student-1", class_id: "class-1", month: "2026-13" },
      { student_id: "student-1", class_id: "class-1", entry_date: "2026-02-30" },
    ];
    for (const query of invalidQueries) {
      assert.equal(studentProgressDailyQuerySchema.safeParse(query).success, false);
    }

    const invalidPuts = [
      {
        student_id: "student-1",
        class_id: "class-1",
        entry_date: "2026-06-13",
        entries: [{ entry_type: "skill_assessment", score: 80 }],
      },
      {
        student_id: "student-1",
        class_id: "class-1",
        entry_date: "2026-06-13",
        entries: [{ entry_type: "skill_assessment", skill_key: "listening", score: 101 }],
      },
    ];
    for (const payload of invalidPuts) {
      assert.equal(studentProgressDailyPutSchema.safeParse(payload).success, false);
    }
  });

  it("requires the full date identity for DELETE", () => {
    assert.equal(
      studentProgressDailyDeleteSchema.safeParse({
        student_id: "student-1",
        class_id: "class-1",
        entry_date: "2026-06-13",
      }).success,
      true
    );
    assert.equal(
      studentProgressDailyDeleteSchema.safeParse({
        student_id: "student-1",
        class_id: "class-1",
        month: "2026-06",
      }).success,
      false
    );
  });
});
