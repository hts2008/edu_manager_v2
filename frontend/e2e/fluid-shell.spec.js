import { expect, test } from "@playwright/test";
import path from "node:path";

const studentId = "student-dashboard";
const classId = "class-dashboard";
const month = "2026-06";

const viewports = [
  { name: "mobile", width: 390, height: 844, columns: 1 },
  { name: "tablet-portrait", width: 768, height: 1024, columns: 1 },
  { name: "tablet-landscape", width: 1024, height: 768, columns: 1 },
  { name: "desktop", width: 1440, height: 900, columns: 2 },
  { name: "wide-desktop", width: 1920, height: 1080, columns: 2 },
  { name: "ultrawide", width: 2560, height: 1440, columns: 4 },
];

function timelinePayload(from, to) {
  const skills = {
    listening: { raw_score: 70, weighted_score: 74 },
    speaking: { raw_score: 65, weighted_score: 69 },
    reading: { raw_score: 78, weighted_score: 82 },
    writing: { raw_score: 72, weighted_score: 76 },
    homework: { raw_score: 80, weighted_score: 84 },
    daily_practice: { raw_score: 75, weighted_score: 79 },
    mock_test: { raw_score: 68, weighted_score: 72 },
  };
  const day = {
    date: "2026-06-12",
    month,
    month_finalized: false,
    raw_score: 72,
    weighted_score: 76,
    delta: 5,
    points: 508,
    cumulative_points: 508,
    skills,
    entries: [],
  };
  const series = Object.fromEntries(Object.entries(skills).map(([key, score]) => [key, [{
    period: day.date,
    raw_score: score.raw_score,
    weighted_score: score.weighted_score,
  }]]));
  return {
    success: true,
    data: {
      student: { id: studentId, name: "Nguyen Minh Anh", parent_name: "Nguyen Thi Lan" },
      class: { id: classId, name: "Flyers B2", track_key: "flyers" },
      from,
      to,
      granularity: "day",
      days: [day],
      series,
      comparison: {},
      summary: {
        first_score: 67,
        latest_score: 72,
        growth: 5,
        cumulative_points: 508,
        focus_skill_key: "speaking",
        alert_score_drop: false,
        skills: {},
      },
    },
  };
}

async function mockDashboard(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("token", "mock-admin-token");
    window.localStorage.setItem("refreshToken", "");
  });
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { user: { id: "admin", username: "admin", role: "admin", full_name: "Admin" } },
    }),
  }));
  await page.route("**/api/teachers**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { teachers: [] } }),
  }));
  await page.route("**/api/reports/student-progress**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        students: [{
          student_id: studentId,
          student_name: "Nguyen Minh Anh",
          parent_name: "Nguyen Thi Lan",
          class_id: classId,
          class_name: "Flyers B2",
          month,
          english_track: "flyers",
          focus_skill_key: "speaking",
          focus_skill_label: "Nói",
          progress_score: 72,
        }],
      },
    }),
  }));
  await page.route("**/api/student-progress/timeline**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(timelinePayload(
        url.searchParams.get("from") || "2026-06-01",
        url.searchParams.get("to") || "2026-06-30",
      )),
    });
  });
  await page.route("**/api/student-progress/daily**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        entry_date: "2026-06-12",
        daily_entries: [],
        progress_month: { track_key: "flyers", is_finalized: false },
      },
    }),
  }));
}

for (const viewport of viewports) {
  test(`student progress shell is fluid at ${viewport.name} ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockDashboard(page);
    await page.goto(`/student-progress/${studentId}?class_id=${classId}&month=${month}`);

    const progressPage = page.getByTestId("student-progress-detail-page");
    const charts = page.getByTestId("student-progress-charts");
    const main = page.locator("main.eduflow-main");
    await expect(progressPage).toBeVisible();
    await expect(charts).toBeVisible();

    const metrics = await page.evaluate(() => {
      const mainElement = document.querySelector("main.eduflow-main");
      const pageElement = document.querySelector('[data-testid="student-progress-detail-page"]');
      const chartElement = document.querySelector('[data-testid="student-progress-charts"]');
      if (!mainElement || !pageElement || !chartElement) throw new Error("Missing fluid layout surfaces");
      const mainRect = mainElement.getBoundingClientRect();
      const contentTrackRect = mainElement.parentElement?.getBoundingClientRect();
      if (!contentTrackRect) throw new Error("Missing authenticated content track");
      const pageRect = pageElement.getBoundingClientRect();
      const gridColumns = getComputedStyle(chartElement).gridTemplateColumns
        .split(" ")
        .filter(Boolean).length;
      return {
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        leftGutter: pageRect.left - mainRect.left,
        rightGutter: mainRect.right - pageRect.right,
        contentRatio: pageRect.width / mainRect.width,
        shellTrackRatio: mainRect.width / contentTrackRect.width,
        gridColumns,
      };
    });

    expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(metrics.shellTrackRatio).toBeGreaterThanOrEqual(0.99);
    expect(Math.abs(metrics.leftGutter - metrics.rightGutter)).toBeLessThanOrEqual(2);
    expect(metrics.gridColumns).toBe(viewport.columns);
    if (viewport.width >= 1920) expect(metrics.contentRatio).toBeGreaterThanOrEqual(0.9);
    await expect(main).toBeVisible();
    await page.screenshot({
      path: path.resolve(
        "..",
        "docs",
        "artifacts",
        "ux-fluid-2026-08-11",
        `${viewport.name}-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  });
}
