import { expect, test } from "@playwright/test";
import {
  authHeaders,
  expectApiSuccess,
  getAttendancePeriod,
  loginAsAdmin,
  phase4RuntimeRequirements,
  studentIsEnrolledOn,
  transitionAttendancePeriod,
} from "./helpers/audit-phase4-runtime.js";

const runtime = phase4RuntimeRequirements([
  "E2E_ADMIN_USERNAME",
  "E2E_ADMIN_PASSWORD",
  "E2E_ATTENDANCE_CLASS_ID",
  "E2E_ATTENDANCE_MONTH",
]);

test.describe("Audit V2 Phase 4 - attendance lifecycle", () => {
  test("save -> submit -> approve -> lock -> reject writes -> reopen", async ({
    request,
  }) => {
    test.skip(!runtime.ready, runtime.reason);

    const {
      E2E_ADMIN_USERNAME: username,
      E2E_ADMIN_PASSWORD: password,
      E2E_ATTENDANCE_CLASS_ID: classId,
      E2E_ATTENDANCE_MONTH: month,
    } = runtime.values;
    const { token } = await loginAsAdmin(request, username, password);
    const headers = authHeaders(token);

    const [classResponse, planResponse] = await Promise.all([
      request.get(`/api/classes?id=${encodeURIComponent(classId)}`, { headers }),
      request.get(
        `/api/class-sessions/month-plan?class_id=${encodeURIComponent(
          classId
        )}&month=${encodeURIComponent(month)}`,
        { headers }
      ),
    ]);
    const classBody = await expectApiSuccess(classResponse, "load class fixture");
    const planBody = await expectApiSuccess(planResponse, "load month plan");
    const classData = classBody.data;
    const regularDates = (planBody.data?.sessions || [])
      .filter(
        (session) =>
          session.kind === "regular" && session.status !== "cancelled"
      )
      .map((session) => session.session_date)
      .filter((date) => date?.startsWith(`${month}-`));

    test.skip(
      regularDates.length === 0,
      `Fixture ${classId}/${month} has no published regular sessions`
    );
    const students = classData?.students || [];
    test.skip(students.length === 0, `Fixture class ${classId} has no roster`);

    let period = await getAttendancePeriod(request, token, classId, month);
    if (period && period.status !== "open") {
      const reopen = await request.post(
        `/api/attendance-periods/${encodeURIComponent(
          period.id
        )}?action=reopen-for-correction`,
        {
          headers,
          data: { reason: `Audit Phase 4 fixture reset ${Date.now()}` },
        }
      );
      if (!reopen.ok()) {
        const body = await reopen.json().catch(() => null);
        test.skip(
          true,
          `Fixture period cannot be reset safely (${reopen.status()} ${body?.error?.code || "unknown"}); use an isolated unpaid month`
        );
      }
    }

    const records = regularDates.flatMap((attendanceDate) =>
      students
        .filter((student) => studentIsEnrolledOn(student, attendanceDate))
        .map((student) => ({
          student_id: student.id,
          class_id: classId,
          attendance_date: attendanceDate,
          status: "present",
        }))
    );
    test.skip(
      records.length === 0,
      `Fixture ${classId}/${month} has no enrolled student/session cells`
    );

    const saveResponse = await request.post("/api/attendance/bulk", {
      headers,
      data: { class_id: classId, dates: regularDates, records },
    });
    const saveBody = await expectApiSuccess(saveResponse, "save attendance");
    expect(saveBody.data?.count).toBe(records.length);

    const monthResponse = await request.get(
      `/api/attendance/month?class_id=${encodeURIComponent(
        classId
      )}&month=${encodeURIComponent(month)}`,
      { headers }
    );
    const monthBody = await expectApiSuccess(
      monthResponse,
      "verify saved attendance"
    );
    const savedCells = new Set(
      (monthBody.data?.attendance || []).map(
        (row) => `${row.student_id}:${row.attendance_date?.slice(0, 10)}`
      )
    );
    for (const row of records) {
      expect(savedCells).toContain(
        `${row.student_id}:${row.attendance_date}`
      );
    }

    const periodResponse = await request.post("/api/attendance-periods", {
      headers,
      data: { class_id: classId, month },
    });
    const periodBody = await expectApiSuccess(
      periodResponse,
      "create attendance period"
    );
    period = periodBody.data?.period;
    expect(period?.status).toBe("open");

    for (const status of ["submitted", "approved", "locked"]) {
      const action =
        status === "submitted"
          ? "submit"
          : status === "approved"
            ? "approve"
            : "lock";
      await transitionAttendancePeriod(request, token, period.id, action);
      period = await getAttendancePeriod(request, token, classId, month);
      expect(period?.status, `${action} must persist ${status}`).toBe(status);
    }

    const lockedWrite = await request.post("/api/attendance/bulk", {
      headers,
      data: { class_id: classId, dates: regularDates, records },
    });
    expect(lockedWrite.status()).toBe(409);
    const lockedBody = await lockedWrite.json();
    expect(lockedBody.success).toBe(false);
    expect(lockedBody.error?.code).toMatch(/LOCK|PERIOD|EDIT/i);

    await transitionAttendancePeriod(
      request,
      token,
      period.id,
      "reopen-for-correction",
      { reason: `Audit Phase 4 correction ${Date.now()}` }
    );
    period = await getAttendancePeriod(request, token, classId, month);
    expect(period?.status).toBe("open");

    const reopenedSave = await request.post("/api/attendance/bulk", {
      headers,
      data: { class_id: classId, dates: regularDates, records },
    });
    await expectApiSuccess(reopenedSave, "save after correction reopen");
  });
});
