import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const utilityPath = new URL("../src/utils/tuitionV3.js", import.meta.url);
const attendancePath = new URL("../src/pages/AttendancePage.jsx", import.meta.url);
const classesPath = new URL("../src/pages/ClassesPage.jsx", import.meta.url);

test("tuition utility preserves replacement and extra billing semantics", async () => {
  const { buildBillingExplanation, calculateTuitionSessionFee, findTuitionSessionConflicts, normalizeTuitionSession } = await import(utilityPath.href);
  const sessions = [
    { id: "regular-1", billing_month: "2026-07", date: "2026-07-02", status: "cancelled", kind: "regular" },
    { id: "makeup-1", billing_month: "2026-07", date: "2026-07-09", status: "held", kind: "makeup", replaces_session_id: "regular-1" },
    { id: "extra-1", billing_month: "2026-07", date: "2026-07-16", status: "held", kind: "extra", extra_fee_mode: "included" },
    { id: "extra-2", billing_month: "2026-07", date: "2026-07-23", status: "planned", kind: "extra", extra_fee_mode: "surcharge" },
  ];
  const result = buildBillingExplanation({ sessions, baseAmount: 1_200_000, surchargeAmount: 150_000 });
  expect(result.summary.replacements).toBe(1);
  expect(result.summary.includedExtra).toBe(1);
  expect(result.summary.surchargeExtra).toBe(1);
  expect(result.totalAmount).toBe(1_350_000);
  expect(normalizeTuitionSession({ kind: "regular", extra_fee_mode: "surcharge" }).extra_fee_mode).toBeNull();
  expect(normalizeTuitionSession({ id: "dto-1", kind: "makeup", session_date: "2026-07-09", replacement_for_id: "regular-1" })).toMatchObject({
    date: "2026-07-09",
    replaces_session_id: "regular-1",
  });
  expect(calculateTuitionSessionFee({ billingPolicy: "per_session", feeAmount: 125_000, plannedSessions: 8 })).toBe(125_000);
  expect(calculateTuitionSessionFee({ billingPolicy: "monthly_prorated", feeAmount: 1_200_000, plannedSessions: 8 })).toBe(150_000);
  expect(calculateTuitionSessionFee({ billingPolicy: "monthly_prorated", feeAmount: 1_200_000, plannedSessions: 0 })).toBe(0);
  expect(findTuitionSessionConflicts(sessions)).toEqual([]);
  expect(findTuitionSessionConflicts([{ ...sessions[1], billing_month: "2026-08" }, sessions[0]])[0].message).toContain("billing_month");
});

test("attendance and classes preserve Tuition V3 billing contracts", async () => {
  const [attendanceSource, classesSource] = await Promise.all([
    fs.readFile(attendancePath, "utf8"),
    fs.readFile(classesPath, "utf8"),
  ]);
  expect(attendanceSource).toContain("feePerSessionByMonth");
  expect(attendanceSource).toContain("dateStr.slice(0, 7)");
  expect(attendanceSource).toContain("Không dùng lịch dự phòng để tính học phí");
  expect(attendanceSource).toContain("response.data.sessions.map(normalizeTuitionSession)");
  expect(attendanceSource).toContain("loadError && selectedClass");
  expect(classesSource).toContain('title: "Học phí"');
  expect(classesSource).toContain('row.billing_policy === "per_session" ? "/buổi" : "/tháng"');
});
