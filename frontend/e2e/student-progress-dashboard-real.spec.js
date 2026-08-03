import { expect, test } from "@playwright/test";

const fixture = {
  studentId: "e2e-spd-student",
  classId: "e2e-spd-class",
  month: "2026-08",
};

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Student Progress real E2E`);
  return value;
}

async function login(page, username, password) {
  await page.goto("/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  const response = page.waitForResponse(
    (item) => item.url().endsWith("/api/auth/login") && item.request().method() === "POST"
  );
  await page.locator("form button[type='submit']").click();
  expect((await response).status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login$/);
}

async function api(page, path, options = {}) {
  return page.evaluate(async ({ path, options }) => {
    const token = localStorage.getItem("token");
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : Array.from(new Uint8Array(await response.arrayBuffer()));
    return { status: response.status, contentType, body };
  }, { path, options });
}

function dailyPayload(date, entries) {
  return {
    student_id: fixture.studentId,
    class_id: fixture.classId,
    entry_date: date,
    note: `Evidence E2E ngoai ngay diem danh ${date}`,
    entries,
  };
}

test("real Student Progress persists two days, compares periods, enforces RBAC and renders PDF", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !/status of (400|403|409)/i.test(message.text())
    ) errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => errors.push(`requestfailed: ${request.method()} ${request.url()}`));

  await login(page, required("E2E_ADMIN_USERNAME"), required("E2E_ADMIN_PASSWORD"));
  const teachers = await api(page, "/api/teachers?page_size=500");
  expect(teachers.status).toBe(200);
  const graderId = teachers.body.data.teachers.find(
    (teacher) => teacher.full_name === "Giao vien Student Progress E2E"
  )?.id;
  expect(graderId).toMatch(/^c[a-z0-9]{8,}$/i);

  const monthlyInput = await api(page, "/api/student-progress", {
    method: "PUT",
    body: JSON.stringify({
      student_id: fixture.studentId,
      class_id: fixture.classId,
      month: fixture.month,
      skills: [
        {
          skill_key: "listening",
          skill_label: "Nghe",
          score: 88,
          max_score: 100,
          source: "teacher_input",
        },
      ],
    }),
  });
  expect([200, 201]).toContain(monthlyInput.status);

  const wrongGrader = await api(page, "/api/student-progress/daily", {
    method: "PUT",
    body: JSON.stringify(dailyPayload("2026-08-02", [
      {
        entry_type: "skill_assessment",
        skill_key: "listening",
        score: 75,
        graded_by_teacher_id: `${graderId}x`,
      },
    ])),
  });
  expect(wrongGrader.status).toBe(400);
  expect(wrongGrader.body.error.code).toBe("GRADER_NOT_ASSIGNED");

  const first = await api(page, "/api/student-progress/daily", {
    method: "PUT",
    body: JSON.stringify(dailyPayload("2026-08-03", [
      { entry_type: "skill_assessment", skill_key: "listening", score: 70, difficulty_level: "flyers", entry_label: "Flyers Listening 1", graded_by_teacher_id: graderId },
      { entry_type: "skill_assessment", skill_key: "reading", score: 68, difficulty_level: "flyers", entry_label: "Flyers Reading 1", graded_by_teacher_id: graderId },
      { entry_type: "homework", skill_key: "homework", score: 90, difficulty_level: "flyers", entry_label: "Homework 1" },
    ])),
  });
  expect(first.status).toBe(200);

  const second = await api(page, "/api/student-progress/daily", {
    method: "PUT",
    body: JSON.stringify(dailyPayload("2026-08-04", [
      { entry_type: "skill_assessment", skill_key: "listening", score: 82, difficulty_level: "ket", entry_label: "KET Listening 2", graded_by_teacher_id: graderId },
      { entry_type: "skill_assessment", skill_key: "reading", score: 78, difficulty_level: "ket", entry_label: "KET Reading 2", graded_by_teacher_id: graderId },
      { entry_type: "mock_test", skill_key: "mock_test", score: null, difficulty_level: "ket", entry_label: "KET Mock 2" },
    ])),
  });
  expect(second.status).toBe(200);
  expect(second.body.data.progress_month.daily_assessment_count).toBe(4);
  expect(second.body.data.progress_month.mock_test_score).toBe(80);

  const preservedMonthlyInput = await api(
    page,
    `/api/student-progress?student_id=${fixture.studentId}&class_id=${fixture.classId}&month=${fixture.month}`
  );
  expect(preservedMonthlyInput.status).toBe(200);
  const preservedListening = preservedMonthlyInput.body.data.progress_months[0].skills.find(
    (skill) => skill.skill_key === "listening"
  );
  expect(preservedListening.score).toBe(88);
  expect(preservedListening.source).toBe("teacher_input");

  const timeline = await api(
    page,
    `/api/student-progress/timeline?student_id=${fixture.studentId}&class_id=${fixture.classId}&from=2026-08-01&to=2026-08-31`
  );
  expect(timeline.status).toBe(200);
  expect(timeline.body.data.days).toHaveLength(2);
  expect(timeline.body.data.summary.growth).not.toBeNull();
  expect(timeline.body.data.comparison.previous_from).toBe("2026-07-01");
  expect(timeline.body.data.comparison.skills.listening.current_raw_score).toBe(76);

  const pdf = await api(
    page,
    `/api/student-progress/pdf?student_id=${fixture.studentId}&class_id=${fixture.classId}&from=2026-08-01&to=2026-08-31`
  );
  expect(pdf.status).toBe(200);
  expect(pdf.contentType).toContain("application/pdf");
  expect(String.fromCharCode(...pdf.body.slice(0, 4))).toBe("%PDF");

  await page.goto(`/student-progress/${fixture.studentId}?class_id=${fixture.classId}`);
  await expect(page.getByTestId("student-progress-detail-page")).toBeVisible();
  await expect(page.getByTestId("progress-timeline-table")).toContainText("03/08/2026");
  await expect(page.getByTestId("progress-timeline-table")).toContainText("04/08/2026");

  await page.evaluate(() => localStorage.clear());
  await login(page, "spd-receptionist", required("E2E_RECEPTIONIST_PASSWORD"));
  const receptionistRead = await api(
    page,
    `/api/student-progress/daily?student_id=${fixture.studentId}&class_id=${fixture.classId}&entry_date=2026-08-04`
  );
  expect(receptionistRead.status).toBe(200);
  const forbiddenFinalize = await api(page, "/api/student-progress", {
    method: "PUT",
    body: JSON.stringify({
      student_id: fixture.studentId,
      class_id: fixture.classId,
      month: fixture.month,
      finalized: true,
      skills: [],
    }),
  });
  expect(forbiddenFinalize.status).toBe(403);
  expect(forbiddenFinalize.body.error.code).toBe("FORBIDDEN");

  await page.evaluate(() => localStorage.clear());
  await login(page, required("E2E_ADMIN_USERNAME"), required("E2E_ADMIN_PASSWORD"));
  const finalized = await api(page, "/api/student-progress", {
    method: "PUT",
    body: JSON.stringify({
      student_id: fixture.studentId,
      class_id: fixture.classId,
      month: fixture.month,
      finalized: true,
      skills: [],
    }),
  });
  expect(finalized.status).toBe(200);
  expect(finalized.body.data.progress_month.is_finalized).toBe(true);

  const lockedWrite = await api(page, "/api/student-progress/daily", {
    method: "PUT",
    body: JSON.stringify(dailyPayload("2026-08-05", [
      { entry_type: "skill_assessment", skill_key: "speaking", score: 81 },
    ])),
  });
  expect(lockedWrite.status).toBe(409);
  expect(lockedWrite.body.error.code).toBe("PROGRESS_MONTH_FINALIZED");

  const reopened = await api(page, "/api/student-progress", {
    method: "PUT",
    body: JSON.stringify({
      action: "reopen",
      student_id: fixture.studentId,
      class_id: fixture.classId,
      month: fixture.month,
      reason: "Reopen for Student Progress real E2E verification",
    }),
  });
  expect(reopened.status).toBe(200);
  expect(reopened.body.data.progress_month.is_finalized).toBe(false);

  const clearManualInput = await api(page, "/api/student-progress", {
    method: "PUT",
    body: JSON.stringify({
      student_id: fixture.studentId,
      class_id: fixture.classId,
      month: fixture.month,
      skills: [],
    }),
  });
  expect(clearManualInput.status).toBe(200);

  for (const date of ["2026-08-03", "2026-08-04"]) {
    const deleted = await api(
      page,
      `/api/student-progress/daily?student_id=${fixture.studentId}&class_id=${fixture.classId}&entry_date=${date}`,
      { method: "DELETE" }
    );
    expect(deleted.status).toBe(200);
    if (date === "2026-08-04") {
      expect(deleted.body.data.progress_month.daily_assessment_count).toBe(0);
      expect(deleted.body.data.progress_month.progress_score).toBe(0);
    }
  }
  expect(errors).toEqual([]);
});
