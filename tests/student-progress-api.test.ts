import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { studentProgressUpsertSchema } from "../lib/validation.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const progressApi = source("server/api/student-progress/index.ts");
const reportApi = source("server/api/reports/student-progress.ts");
const router = source("api/router.ts");

const validPayload = {
  student_id: "student-1",
  class_id: "class-1",
  month: "2026-06",
};

describe("student progress API contract", () => {
  it("is admin-only and routes GET to list plus POST/PUT to upsert", () => {
    assert.match(progressApi, /export default requireAuth\(handler,\s*\["admin"\]\)/);
    assert.match(progressApi, /if \(req\.method === "GET"\) return listProgress\(req, res\)/);
    assert.match(
      progressApi,
      /if \(req\.method === "POST" \|\| req\.method === "PUT"\) return upsertProgress\(req, res\)/
    );
  });

  it("exposes the list and upsert endpoint through the production router", () => {
    assert.match(
      router,
      /studentProgressIndex:\s*\(\) => import\("\.\.\/server\/api\/student-progress\/index\.js"\)/
    );
    assert.match(
      router,
      /exact\(parts,\s*\["student-progress"\],\s*routes\.studentProgressIndex\)/
    );
    assert.match(router, /return sendApiError\(res,\s*error\)/);
  });

  it("maps stored progress records to snake_case response fields", () => {
    const expectedMappings = [
      /student_id:\s*record\.studentId/,
      /class_id:\s*record\.classId/,
      /track_key:\s*record\.trackKey/,
      /progress_score:\s*record\.progressScore/,
      /learning_evidence_coverage:\s*record\.learningEvidenceCoverage/,
      /parent_summary:\s*record\.parentSummary/,
      /mock_test_score:\s*record\.mockTestScore/,
      /daily_entries:/,
      /entry_date:\s*toDateOnly\(entry\.entryDate\)/,
      /shield_count:\s*entry\.shieldCount/,
    ];

    for (const mapping of expectedMappings) {
      assert.match(progressApi, mapping);
    }
    assert.match(progressApi, /progress_months:\s*records\.map\(progressMonthToDto\)/);
    assert.match(progressApi, /progress_month:\s*progressMonthToDto\(record\)/);
  });

  it("delegates all daily entry writes to the dedicated daily API", () => {
    assert.match(progressApi, /"DAILY_ENTRY_API_REQUIRED"/);
    assert.match(progressApi, /"daily_entries"/);
    assert.match(progressApi, /"dailyEntries"/);
    assert.match(progressApi, /409/);
    assert.doesNotMatch(
      progressApi,
      /studentProgressDailyEntry\.deleteMany|studentProgressDailyEntry\.createMany/
    );
  });

  it("integrates saved assessment rows into the parent report source", () => {
    assert.match(reportApi, /prisma\.studentProgressMonth\.findMany/);
    assert.match(reportApi, /skills:\s*\{\s*orderBy:\s*\{\s*sortOrder:\s*"asc"\s*\}\s*\}/);
    assert.match(
      reportApi,
      /dailyEntries:\s*\{\s*orderBy:\s*\[\{ entryDate: "asc" \}, \{ createdAt: "asc" \}\]\s*\}/
    );
    assert.match(reportApi, /const progressMonthsByKey = new Map<string, ProgressMonthSnapshot>\(\)/);
    assert.match(reportApi, /progressRecordToSnapshot\(record\)/);
    assert.match(reportApi, /progressMonthsByKey,/);
  });
});

describe("student progress payload validation", () => {
  it("accepts the minimum upsert payload and applies stable defaults", () => {
    const result = studentProgressUpsertSchema.safeParse(validPayload);

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(result.data.skills, []);
    assert.equal(result.data.finalized, false);
  });

  it("accepts the supported assessment payload shape", () => {
    const result = studentProgressUpsertSchema.safeParse({
      ...validPayload,
      track_key: "ket",
      class_type: "exam_prep",
      focus_skill_key: "speaking",
      mock_test_score: 82.5,
      skills: [
        {
          skill_key: "listening",
          score: 78,
          max_score: 100,
          status: "available",
        },
      ],
    });

    assert.equal(result.success, true);
  });

  it("rejects missing identifiers, malformed months, and unsupported enums", () => {
    const invalidPayloads = [
      { class_id: "class-1", month: "2026-06" },
      { student_id: "student-1", month: "2026-06" },
      { ...validPayload, month: "2026-6" },
      { ...validPayload, track_key: "ielts" },
      { ...validPayload, class_type: "private" },
      { ...validPayload, focus_skill_key: "grammar" },
    ];

    for (const payload of invalidPayloads) {
      assert.equal(studentProgressUpsertSchema.safeParse(payload).success, false);
    }
  });

  it("rejects out-of-range scores and invalid nested skill fields", () => {
    const invalidPayloads = [
      { ...validPayload, mock_test_score: 101 },
      { ...validPayload, skills: [{ skill_key: "listening", score: -1 }] },
      {
        ...validPayload,
        skills: [{ skill_key: "listening", score: 80, max_score: 0 }],
      },
    ];

    for (const payload of invalidPayloads) {
      assert.equal(studentProgressUpsertSchema.safeParse(payload).success, false);
    }
  });
});
