import { expect, test } from "@playwright/test";

const studentId = "student-daily";
const classId = "class-daily";
const month = "2026-06";
const dayA = "2026-06-10";
const dayB = "2026-06-12";
const skillKeys = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "homework",
  "daily_practice",
  "mock_test",
];

async function setupAuth(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("token", "mock-admin-token");
    window.localStorage.setItem("refreshToken", "");
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: { id: "admin", username: "admin", role: "admin", full_name: "Admin" },
        },
      }),
    });
  });
}

function reportPayload() {
  const missingSkills = skillKeys.map((key) => ({
    key,
    label: key,
    score: null,
    status: "missing_input",
    note: "",
  }));
  return {
    success: true,
    data: {
      summary: {},
      charts: { monthly: [], tracks: [], readiness: [] },
      students: [
        {
          student_id: studentId,
          student_name: "Hoc vien Daily",
          class_id: classId,
          class_name: "Daily Class",
          month,
          english_track: "starters",
          track_label: "Pre A1 Starters",
          cefr_level: "Pre A1",
          progress_score: 0,
          attendance_score: 100,
          consistency_score: 100,
          learning_evidence_coverage: 0,
          academic_input_status: "missing_input",
          parent_summary: "",
          next_actions: [],
          recorded_sessions: 2,
          expected_sessions: 2,
          attendance_dates: [dayA, dayB],
          skill_scores: missingSkills,
          progress_assessment: {
            trackKey: "starters",
            classType: "communicative",
            academicInputStatus: "missing_input",
            skillScores: missingSkills,
          },
        },
      ],
      pagination: { page: 1, page_size: 50, total_items: 1, total_pages: 1 },
      meta: { classes: [{ id: classId, class_name: "Daily Class" }] },
      framework: { tracks: { starters: { label: "Pre A1 Starters" } } },
    },
  };
}

function monthlyPayload() {
  return {
    success: true,
    data: {
      progress_months: [
        {
          student_id: studentId,
          class_id: classId,
          month,
          track_key: "starters",
          class_type: "communicative",
          teacher_note: "",
          parent_summary: "",
          finalized_at: null,
          skills: skillKeys.map((skill_key, sort_order) => ({
            skill_key,
            skill_label: skill_key,
            score: null,
            max_score: 100,
            status: "missing_input",
            source: "teacher_input",
            sort_order,
          })),
        },
      ],
    },
  };
}

function makeRollup(store) {
  const assessments = [...store.values()].flatMap((entries) =>
    entries.filter((entry) => entry.entry_type === "skill_assessment" && entry.score !== null),
  );
  const scores = assessments.map((entry) => Number(entry.score));
  return {
    average_score: scores.length
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
      : null,
    latest_score: scores.at(-1) ?? null,
    score_delta: scores.length > 1 ? scores.at(-1) - scores[0] : scores.length ? 0 : null,
    assessment_count: scores.length,
    focus_skill_key: assessments[0]?.skill_key || null,
    focus_skill_label: assessments[0]?.skill_key || null,
    skills: [],
  };
}

function dailyPayload(store, entryDate = null) {
  const entries = entryDate
    ? store.get(entryDate) || []
    : [...store.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .flatMap(([, value]) => value);
  const note = entries.find((entry) => entry.entry_type === "note")?.note || null;
  return {
    success: true,
    data: {
      progress_month: { student_id: studentId, class_id: classId, month },
      student_id: studentId,
      class_id: classId,
      month,
      entry_date: entryDate,
      note,
      daily_entries: entries,
      rollup: makeRollup(store),
    },
  };
}

async function mockStudentProgress(page, { dailyDelay = 0 } = {}) {
  const store = new Map();
  const monthlyWrites = [];
  await setupAuth(page);
  await page.route("**/api/reports/student-progress**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(reportPayload()),
    }),
  );
  await page.route("**/api/student-progress/daily**", async (route) => {
    if (dailyDelay) await new Promise((resolve) => setTimeout(resolve, dailyDelay));
    const request = route.request();
    const url = new URL(request.url());
    const entryDate = url.searchParams.get("entry_date");
    if (request.method() === "PUT") {
      const body = request.postDataJSON();
      const entries = body.entries.map((entry, index) => ({
        id: `${body.entry_date}-${index}`,
        entry_date: body.entry_date,
        ...entry,
      }));
      if (body.note) {
        entries.push({
          id: `${body.entry_date}-note`,
          entry_date: body.entry_date,
          entry_type: "note",
          skill_key: null,
          score: null,
          shield_count: 0,
          note: body.note,
        });
      }
      store.set(body.entry_date, entries);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(dailyPayload(store, body.entry_date)),
      });
    }
    if (request.method() === "DELETE") {
      store.delete(entryDate);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(dailyPayload(store, entryDate)),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(dailyPayload(store, entryDate)),
    });
  });
  await page.route(/\/api\/student-progress(?:\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      monthlyWrites.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { progress_month: monthlyPayload().data.progress_months[0] },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(monthlyPayload()),
    });
  });
  return { store, monthlyWrites };
}

async function openDailyPanel(page) {
  await page.goto("/student-progress");
  await expect(page.getByTestId("progress-input-panel")).toBeVisible();
  await expect(page.getByTestId("daily-progress-editor")).toBeVisible();
}

async function fillListeningAndSave(page, date, score, note = "") {
  const editor = page.getByTestId("daily-progress-editor");
  await editor.getByLabel(/Ngày ghi nhận|Ngay ghi nhan/).fill(date);
  await expect(editor.getByTestId("daily-entry-date")).toHaveValue(date);
  await expect(editor.getByText(/Đang tải dữ liệu ngày|Dang tai du lieu ngay/)).toBeHidden();
  await editor.getByTestId("daily-skill-listening").fill(String(score));
  await editor.getByLabel(/Ghi chú theo ngày|Ghi chu theo ngay/).fill(note);
  await editor.getByTestId("save-daily-progress").click();
  await expect(editor.getByText(/Đã lưu \d{4}-\d{2}-\d{2}|Da luu \d{4}-\d{2}-\d{2}/)).toBeVisible();
}

test("daily snapshots isolate day A while day B is edited and deleted", async ({ page }) => {
  const { store, monthlyWrites } = await mockStudentProgress(page);
  await openDailyPanel(page);

  await fillListeningAndSave(page, dayA, 70);
  await fillListeningAndSave(page, dayB, 80);
  expect(store.get(dayA)?.filter((entry) => entry.entry_type === "skill_assessment")).toHaveLength(7);
  expect(store.get(dayA)?.find((entry) => entry.skill_key === "listening")?.score).toBe(70);
  expect(store.get(dayB)?.find((entry) => entry.skill_key === "listening")?.score).toBe(80);

  await page.getByTestId("daily-skill-listening").fill("85");
  await page.getByTestId("save-daily-progress").click();
  await expect(page.getByTestId("daily-progress-editor").getByText(new RegExp(`(?:Đã lưu|Da luu) ${dayB}\\.`))).toBeVisible();
  expect(store.get(dayA)?.find((entry) => entry.skill_key === "listening")?.score).toBe(70);
  expect(store.get(dayB)?.find((entry) => entry.skill_key === "listening")?.score).toBe(85);

  await page.getByTestId("delete-daily-progress").click();
  await expect(page.getByTestId("daily-progress-editor").getByText(new RegExp(`(?:Đã xóa|Da xoa) ${dayB}\\.`))).toBeVisible();
  expect(store.has(dayB)).toBeFalsy();
  expect(store.get(dayA)?.find((entry) => entry.skill_key === "listening")?.score).toBe(70);
  await expect(page.getByTestId("daily-timeline")).toContainText("10/06/2026");
  await expect(page.getByTestId("daily-timeline")).not.toContainText("12/06/2026");

  await page.getByTestId("save-progress").click();
  await expect.poll(() => monthlyWrites.length).toBe(1);
  expect(monthlyWrites[0]).not.toHaveProperty("daily_entries");
});

test("an arbitrary non-attendance date requires a teacher note", async ({ page }) => {
  const { store } = await mockStudentProgress(page);
  await openDailyPanel(page);
  const editor = page.getByTestId("daily-progress-editor");
  await editor.getByLabel(/Ngày ghi nhận|Ngay ghi nhan/).fill("2026-06-15");
  await expect(editor.getByText(/Đang tải dữ liệu ngày|Dang tai du lieu ngay/)).toBeHidden();
  await editor.getByTestId("daily-skill-listening").fill("75");
  await editor.getByTestId("save-daily-progress").click();
  await expect(editor.getByRole("alert")).toContainText(/bắt buộc có ghi chú|bat buoc co ghi chu/i);
  expect(store.has("2026-06-15")).toBeFalsy();

  await editor.getByLabel(/Ghi chú theo ngày|Ghi chu theo ngay/).fill("Luyện bổ sung ngoài lịch điểm danh");
  await editor.getByTestId("save-daily-progress").click();
  await expect(editor.getByText(/Đã lưu 2026-06-15\.|Da luu 2026-06-15\./)).toBeVisible();
  expect(store.has("2026-06-15")).toBeTruthy();
});

test("daily editor exposes an accessible loading state", async ({ page }) => {
  await mockStudentProgress(page, { dailyDelay: 2_000 });
  await page.goto("/student-progress");
  const editor = page.getByTestId("daily-progress-editor");
  await expect(editor).toBeVisible();
  await expect(editor.getByText(/Đang tải dữ liệu ngày|Dang tai du lieu ngay/)).toBeVisible();
  await expect(editor.getByTestId("save-daily-progress")).toBeDisabled();
  await expect(editor.getByText(/Chưa có dữ liệu cho ngày này|Chua co du lieu cho ngay nay/)).toBeVisible();
});
