import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const endpoints = [
  "server/api/reports/bi.ts",
  "server/api/reports/student-progress.ts",
  "server/api/student-progress/index.ts",
].map((path) => ({ path, source: source(path) }));

function prismaQueryBlock(endpoint: string, model: string) {
  const match = new RegExp(
    `prisma\\.${model}\\.find(?:Many|Unique)\\(\\{([\\s\\S]*?)\\n\\s*\\}\\),`,
  ).exec(endpoint);
  assert.ok(match, `missing ${model} denominator query`);
  return match[1];
}

describe("report endpoint denominator source contract", () => {
  for (const endpoint of endpoints) {
    it(`${endpoint.path} supplies every authoritative denominator source`, () => {
      const feeLineQuery = prismaQueryBlock(endpoint.source, "monthlyFeeLine");
      assert.match(feeLineQuery, /select:\s*\{/);
      assert.match(feeLineQuery, /calculationSnapshot:\s*true/);

      const monthPlanQuery = prismaQueryBlock(endpoint.source, "classMonthPlan");
      assert.match(monthPlanQuery, /select:\s*\{/);
      assert.match(monthPlanQuery, /classId:\s*true/);
      assert.match(monthPlanQuery, /billingMonth:\s*true/);
      assert.match(monthPlanQuery, /revisions:\s*\{/);
      assert.match(monthPlanQuery, /orderBy:\s*\{\s*revision:\s*"desc"\s*\}/);
      assert.match(monthPlanQuery, /select:\s*\{\s*revision:\s*true,\s*snapshot:\s*true\s*\}/);
      assert.doesNotMatch(monthPlanQuery, /take:\s*1/);

      const classSessionQuery = prismaQueryBlock(endpoint.source, "classSession");
      assert.match(classSessionQuery, /kind:\s*"regular"/);
      assert.match(classSessionQuery, /select:\s*\{/);
      for (const field of ["classId", "billingMonth", "sessionDate", "kind", "status"]) {
        assert.match(classSessionQuery, new RegExp(`${field}:\\s*true`));
      }

      assert.match(endpoint.source, /classMonthPlans:\s*classMonthPlanRows\.map/);
      assert.match(endpoint.source, /revisions:\s*row\.revisions/);
      assert.doesNotMatch(endpoint.source, /snapshot:\s*row\.revisions\[0\]\?\.snapshot/);
      assert.match(endpoint.source, /classSessions:\s*classSessionRows/);
    });
  }

  for (const endpoint of endpoints.slice(0, 2)) {
    it(`${endpoint.path} bounds denominator reads to report classes and months`, () => {
      const monthPlanQuery = prismaQueryBlock(endpoint.source, "classMonthPlan");
      assert.match(monthPlanQuery, /classId:\s*\{\s*in:\s*classIds\s*\}/);
      assert.match(monthPlanQuery, /billingMonth:\s*\{\s*in:\s*query\.months\s*\}/);

      const classSessionQuery = prismaQueryBlock(endpoint.source, "classSession");
      assert.match(classSessionQuery, /classId:\s*\{\s*in:\s*classIds\s*\}/);
      assert.match(classSessionQuery, /billingMonth:\s*\{\s*in:\s*query\.months\s*\}/);
    });
  }

  it("the single-student operational read uses its exact class and month", () => {
    const endpoint = endpoints[2].source;
    for (const model of ["classMonthPlan", "classSession"]) {
      const query = prismaQueryBlock(endpoint, model);
      assert.match(query, /classId,/);
      assert.match(query, /billingMonth:\s*month/);
    }
  });

  it("the single-student operational read prefers a period intersecting the requested month", () => {
    const endpoint = endpoints[2].source;
    assert.match(endpoint, /const enrollmentPeriod = await prisma\.enrollmentPeriod\.findFirst/);
    assert.match(endpoint, /startedAt:\s*\{\s*lt:\s*endDate\s*\}/);
    assert.match(endpoint, /OR:\s*\[\{\s*endedAt:\s*null\s*\},\s*\{\s*endedAt:\s*\{\s*gt:\s*startDate\s*\}\s*\}\s*\]/);
    assert.match(endpoint, /const legacyEnrollment = enrollmentPeriod\s*\n\s*\? null/);
    assert.match(endpoint, /enrollmentEndDate:\s*enrollmentPeriod\.endedAt/);
  });

  it("the BI report passes authoritative EnrollmentPeriod bounds into the cube", () => {
    const endpoint = endpoints[0].source;
    assert.match(endpoint, /const enrollmentPeriodWhere[\s\S]*startedAt:\s*\{\s*lte:\s*rangeEnd\s*\}/);
    assert.match(endpoint, /OR:\s*\[\{\s*endedAt:\s*null\s*\},\s*\{\s*endedAt:\s*\{\s*gt:\s*rangeStart\s*\}\s*\}\s*\]/);
    assert.match(endpoint, /prisma\.enrollmentPeriod\.findMany\(\{[\s\S]*?where:\s*enrollmentPeriodWhere/);
    assert.match(endpoint, /const reportEnrollmentRows[^=]*=\s*\[\s*\.\.\.enrollmentPeriodRows\.map/);
    assert.match(endpoint, /enrollmentDate:\s*period\.startedAt/);
    assert.match(endpoint, /enrollmentEndDate:\s*period\.endedAt/);
    assert.match(endpoint, /periodKeys\.has\(evidenceKey\(row\.studentId, row\.classId\)\)/);
  });

  it("uses EnrollmentPeriod as the primary universe in the student progress report", () => {
    const endpoint = endpoints[1].source;
    assert.match(endpoint, /const enrollmentPeriodWhere[\s\S]*startedAt:\s*\{\s*lte:\s*rangeEnd\s*\}/);
    assert.match(endpoint, /prisma\.enrollmentPeriod\.findMany\(\{[\s\S]*?where:\s*enrollmentPeriodWhere/);
    assert.match(endpoint, /const reportEnrollmentRows[^=]*=\s*\[\s*\.\.\.enrollmentPeriodRows\.map/);
    assert.match(endpoint, /\.\.\.enrollmentRows\.filter\(\s*\(row\) => !periodKeys\.has/);
  });
});
