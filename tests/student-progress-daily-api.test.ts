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
  it("is admin-only and exposes GET, PUT, and DELETE through the production router", () => {
    assert.match(dailyApi, /if \(req\.method === "GET"\) return listDailyEntries\(req, res\)/);
    assert.match(dailyApi, /if \(req\.method === "PUT"\) return replaceDailyEntries\(req, res\)/);
    assert.match(dailyApi, /if \(req\.method === "DELETE"\) return deleteDailyEntries\(req, res\)/);
    assert.match(dailyApi, /export default requireAuth\(handler,\s*\["admin"\]\)/);
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
    assert.match(monthlyApi, /skill\.source === "daily_rollup"/);
    assert.match(monthlyApi, /source:\s*"daily_rollup"/);
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
        },
        {
          entry_type: "daily_practice",
          score: null,
        },
      ],
    });

    assert.equal(result.success, true);
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
