import { expect, test } from "@playwright/test";

const studentId = "student-dashboard";
const classId = "class-dashboard";
const month = "2026-06";
const skillKeys = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "homework",
  "daily_practice",
  "mock_test",
];

function reportRow() {
  return {
    student_id: studentId,
    student_name: "Nguyen Minh Anh",
    parent_name: "Nguyen Thi Lan",
    class_id: classId,
    class_name: "Flyers B2",
    month,
    english_track: "flyers",
    track_label: "A2 Flyers",
    average_score: 70,
    score_delta: 10,
    assessment_count: 2,
    last_entry_date: "2026-06-12",
    focus_skill_key: "speaking",
    focus_skill_label: "Nói",
    alert_score_drop: false,
    progress_score: 70,
    learning_evidence_coverage: 100,
    academic_input_status: "complete",
    skill_scores: [],
  };
}

function timelinePayload(store, from, to) {
  const rows = [...store.entries()]
    .filter(([date]) => date >= from && date <= to)
    .sort(([left], [right]) => left.localeCompare(right));
  let previous = null;
  let cumulative = 0;
  const days = rows.map(([date, entries]) => {
    const skills = Object.fromEntries(skillKeys.map((key) => {
      const entry = entries.find((item) => item.skill_key === key);
      return [key, {
        raw_score: entry?.score ?? null,
        weighted_score: entry?.score === null || entry?.score === undefined
          ? null
          : Math.min(100, Math.round(entry.score * 1.1 * 10) / 10),
      }];
    }));
    const scores = Object.values(skills).map((item) => item.raw_score).filter((score) => score !== null);
    const raw = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    const weightedScores = Object.values(skills).map((item) => item.weighted_score).filter((score) => score !== null);
    const weighted = weightedScores.length
      ? weightedScores.reduce((sum, score) => sum + score, 0) / weightedScores.length
      : null;
    const delta = raw === null || previous === null ? null : raw - previous;
    if (raw !== null) previous = raw;
    cumulative += scores.reduce((sum, score) => sum + score, 0);
    return {
      date,
      month: date.slice(0, 7),
      month_finalized: false,
      raw_score: raw,
      weighted_score: weighted,
      delta,
      points: scores.reduce((sum, score) => sum + score, 0),
      cumulative_points: cumulative,
      skills,
      entries: entries.map((entry, index) => ({
        id: `${date}-${index}`,
        weighted_score: entry.score === null || entry.score === undefined ? null : Math.min(100, entry.score * 1.1),
        ...entry,
      })),
    };
  });
  const series = Object.fromEntries(skillKeys.map((key) => [key, days.map((day) => ({
    period: day.date,
    raw_score: day.skills[key].raw_score,
    weighted_score: day.skills[key].weighted_score,
  }))]));
  const first = days.find((day) => day.raw_score !== null)?.raw_score ?? null;
  const latest = [...days].reverse().find((day) => day.raw_score !== null)?.raw_score ?? null;
  return {
    success: true,
    data: {
      student: { id: studentId, name: "Nguyen Minh Anh", parent_name: "Nguyen Thi Lan" },
      class: { id: classId, name: "Flyers B2", track_key: "flyers" },
      from,
      to,
      granularity: from.slice(0, 4) === to.slice(0, 4) && from.slice(5, 7) !== to.slice(5, 7) ? "month" : "day",
      days,
      series,
      summary: {
        first_score: first,
        latest_score: latest,
        growth: first === null || latest === null ? null : latest - first,
        cumulative_points: cumulative,
        focus_skill_key: "speaking",
        alert_score_drop: false,
        skills: Object.fromEntries(skillKeys.map((key) => [key, {
          first_score: days[0]?.skills[key]?.raw_score ?? null,
          latest_score: days.at(-1)?.skills[key]?.raw_score ?? null,
          growth: null,
        }])),
      },
    },
  };
}

async function mockDashboard(page) {
  const store = new Map([
    ["2026-06-10", [{ entry_type: "skill_assessment", skill_key: "listening", score: 60, difficulty_level: "flyers", entry_label: "Flyers Test 1" }]],
  ]);
  const timelineRequests = [];
  await page.addInitScript(() => {
    window.localStorage.setItem("token", "mock-admin-token");
    window.localStorage.setItem("refreshToken", "");
  });
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { user: { id: "admin", username: "admin", role: "admin", full_name: "Admin" } } }),
  }));
  await page.route("**/api/teachers**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { teachers: [{ id: "teacher-1", full_name: "Tran Thi Mai" }] } }),
  }));
  await page.route("**/api/reports/student-progress**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        summary: {}, charts: { monthly: [], tracks: [], readiness: [] }, students: [reportRow()],
        pagination: { page: 1, page_size: 200, total_items: 1, total_pages: 1 },
        meta: { classes: [{ id: classId, class_name: "Flyers B2" }] },
        framework: { tracks: { flyers: { label: "A2 Flyers" } } },
      },
    }),
  }));
  await page.route(/\/api\/student-progress(?:\?|$)/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { progress_months: [] } }),
  }));
  await page.route("**/api/student-progress/timeline**", (route) => {
    const url = new URL(route.request().url());
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    timelineRequests.push({ from, to });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(timelinePayload(store, from, to)),
    });
  });
  await page.route("**/api/student-progress/daily**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const entryDate = url.searchParams.get("entry_date");
    if (request.method() === "PUT") {
      const body = request.postDataJSON();
      store.set(body.entry_date, body.entries.map((entry) => ({ ...entry })));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { daily_entries: store.get(body.entry_date), progress_month: { is_finalized: false } } }) });
    }
    if (request.method() === "DELETE") {
      store.delete(entryDate);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { daily_entries: [] } }) });
    }
    const entries = store.get(entryDate) || [];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { entry_date: entryDate, daily_entries: entries, progress_month: { track_key: "flyers", is_finalized: false } } }),
    });
  });
  await page.route("**/api/student-progress/pdf**", (route) => route.fulfill({
    status: 200,
    contentType: "application/pdf",
    body: Buffer.from("%PDF-1.4\n%%EOF"),
  }));
  return { store, timelineRequests };
}

test("list to detail supports daily evidence, ranges, charts and authenticated PDF", async ({ page }) => {
  const { store, timelineRequests } = await mockDashboard(page);
  const runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    runtimeErrors.push(`requestfailed: ${request.method()} ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/") && response.status() >= 500) {
      runtimeErrors.push(`api-${response.status()}: ${response.url()}`);
    }
  });
  await page.goto("/student-progress");
  await expect(page.getByTestId("student-progress-page")).toBeVisible();
  await expect(page.getByText("Nguyen Minh Anh").first()).toBeVisible();
  await page.getByTestId("open-student-progress-detail").click();
  await expect(page).toHaveURL(new RegExp(`/student-progress/${studentId}.*class_id=${classId}`));
  await expect(page.getByTestId("student-progress-detail-page")).toBeVisible();
  await expect(page.getByTestId("student-progress-charts")).toBeVisible();
  await expect(page.getByTestId("progress-timeline-table")).toContainText("10/06/2026");

  const form = page.getByTestId("progress-daily-entry-form");
  await form.getByTestId("progress-entry-date").fill("2026-06-12");
  await expect(form.getByText(/Đang tải|Dang tai/)).toBeHidden();
  await form.getByTestId("progress-entry-type").selectOption("mock_test");
  await form.getByTestId("progress-entry-difficulty").selectOption("ket");
  await form.getByTestId("progress-entry-label").fill("KET Practice Test 2");
  await form.getByTestId("progress-entry-skill-listening").fill("80");
  await form.getByTestId("progress-entry-note").fill("Luyện nghe ngoài lịch học chính khóa.");
  await form.getByTestId("save-progress-day").click();
  await expect(form.getByText("Đã lưu evidence ngày 2026-06-12.")).toBeVisible();
  expect(store.has("2026-06-10")).toBeTruthy();
  expect(store.get("2026-06-12")?.some((entry) => entry.difficulty_level === "ket")).toBeTruthy();
  await expect(page.getByTestId("progress-timeline-table")).toContainText("12/06/2026");
  await expect(page.getByTestId("progress-timeline-table")).toContainText("+20");

  await page.getByRole("button", { name: "Năm", exact: true }).click();
  await expect.poll(() => timelineRequests.at(-1)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  await page.getByRole("button", { name: "Quy đổi", exact: true }).click();
  await expect(page.getByTestId("progress-skills-chart")).toContainText("điểm quy đổi");

  const pdfResponse = page.waitForResponse((response) => response.url().includes("/api/student-progress/pdf") && response.status() === 200);
  await page.getByTestId("print-progress-pdf").click();
  expect((await pdfResponse).headers()["content-type"]).toContain("application/pdf");
  expect(runtimeErrors).toEqual([]);
});
