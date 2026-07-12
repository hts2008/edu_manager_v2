import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStudentTuitionV3 } from "../lib/tuition-v3-service.js";

const classData = {
  id: "flyer-b2",
  className: "Flyer B2",
  billingPolicy: "monthly_prorated",
  feePerDay: 900_000,
  teacher: { fullName: "Teacher" },
};

function juneSessions() {
  return Array.from({ length: 13 }, (_, index) => ({
    id: `session-${index + 1}`,
    classId: "flyer-b2",
    sessionDate: new Date(Date.UTC(2026, 5, index + 1)),
    kind: "regular",
    status: "held",
    extraFeeMode: "included",
    replacementForId: null,
  }));
}

describe("Tuition V3 class-session adapter", () => {
  it("charges the full monthly package when every actual session is attended", () => {
    const sessions = juneSessions();
    const result = buildStudentTuitionV3({
      month: "2026-06",
      classData,
      enrollment: { startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null },
      sessions,
      attendance: sessions.map((session) => ({
        classSessionId: session.id,
        attendanceDate: session.sessionDate,
        status: "present",
      })),
    });
    assert.equal(result.amount, 900_000);
    assert.equal(result.contractSessions, 13);
    assert.equal(result.chargedSessions, 13);
    assert.equal(result.calculationVersion, "tuition-v3-session-ledger");
  });

  it("deducts one waived absence against the actual month plan", () => {
    const sessions = juneSessions();
    const result = buildStudentTuitionV3({
      month: "2026-06",
      classData,
      enrollment: { startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null },
      sessions,
      attendance: sessions.map((session, index) => ({
        classSessionId: session.id,
        attendanceDate: session.sessionDate,
        status: index === 0 ? "absent_no_fee" : "present",
      })),
    });
    assert.equal(result.amount, 830_769);
    assert.equal(result.studentWaivedSessions, 1);
  });

  it("prorates from the first eligible planned session, not calendar weeks", () => {
    const sessions = juneSessions();
    const result = buildStudentTuitionV3({
      month: "2026-06",
      classData,
      enrollment: { startedAt: new Date("2026-06-06T00:00:00Z"), endedAt: null },
      sessions,
      attendance: sessions.map((session) => ({
        classSessionId: session.id,
        attendanceDate: session.sessionDate,
        status: "present",
      })),
    });
    assert.equal(result.eligibleSessions, 8);
    assert.equal(result.amount, 553_846);
  });

  it("rejects a held regular session without student attendance at lock time", () => {
    assert.throws(
      () => buildStudentTuitionV3({
        month: "2026-06",
        classData,
        enrollment: { startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null },
        sessions: juneSessions(),
        attendance: [],
      }),
      (error: any) => error?.code === "ATTENDANCE_INCOMPLETE",
    );
  });

  it("charges a monthly extra surcharge at the derived per-session rate", () => {
    const regularSessions = juneSessions();
    const extraSession = {
      id: "session-extra",
      classId: "flyer-b2",
      sessionDate: new Date(Date.UTC(2026, 5, 30)),
      kind: "extra",
      status: "held",
      extraFeeMode: "surcharge",
      replacementForId: null,
    };
    const sessions = [...regularSessions, extraSession];
    const result = buildStudentTuitionV3({
      month: "2026-06",
      classData,
      enrollment: { startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null },
      sessions,
      attendance: sessions.map((session) => ({
        classSessionId: session.id,
        attendanceDate: session.sessionDate,
        status: "present",
      })),
    });

    assert.equal(result.amount, 969_231);
    assert.equal(result.extraSessions, 1);
  });

  it("does not charge an extra session marked as included", () => {
    const regularSessions = juneSessions();
    const extraSession = {
      id: "session-extra-included",
      classId: "flyer-b2",
      sessionDate: new Date(Date.UTC(2026, 5, 30)),
      kind: "extra",
      status: "held",
      extraFeeMode: "included",
      replacementForId: null,
    };
    const sessions = [...regularSessions, extraSession];
    const result = buildStudentTuitionV3({
      month: "2026-06",
      classData,
      enrollment: { startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null },
      sessions,
      attendance: sessions.map((session) => ({
        classSessionId: session.id,
        attendanceDate: session.sessionDate,
        status: "present",
      })),
    });

    assert.equal(result.amount, 900_000);
    assert.equal(result.extraSessions, 1);
  });

  it("keeps the configured unit price for per-session billing", () => {
    const sessions = juneSessions().slice(0, 3);
    const result = buildStudentTuitionV3({
      month: "2026-06",
      classData: { ...classData, billingPolicy: "per_session", feePerDay: 120_000 },
      enrollment: { startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null },
      sessions,
      attendance: sessions.map((session) => ({
        classSessionId: session.id,
        attendanceDate: session.sessionDate,
        status: "present",
      })),
    });

    assert.equal(result.feePerSession, 120_000);
    assert.equal(result.amount, 360_000);
  });
});
