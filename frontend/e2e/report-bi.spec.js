import { expect, test } from "@playwright/test";

const token = "mock-admin-token";

const biPayload = {
  success: true,
  data: {
    summary: {
      student_count: 2,
      class_count: 2,
      student_class_month_count: 3,
      expected_sessions: 28,
      recorded_sessions: 24,
      chargeable_sessions: 22,
      actual_sessions: 23,
      status_counts: {
        present: 20,
        absent_with_fee: 2,
        absent_no_fee: 1,
        holiday: 1,
        make_up: 2,
      },
      actual_present_rate: 87,
      chargeable_rate: 78.6,
      record_completion_rate: 85.7,
      fee_amount: 2450000,
      fee_review_count: 1,
      risk_count: 1,
    },
    charts: {
      monthly: [
        {
          month: "2026-05",
          student_count: 2,
          class_count: 2,
          student_class_month_count: 2,
          expected_sessions: 18,
          recorded_sessions: 18,
          chargeable_sessions: 17,
          actual_sessions: 18,
          actual_present_rate: 88.9,
          chargeable_rate: 94.4,
          record_completion_rate: 100,
          fee_amount: 1450000,
          fee_review_count: 0,
          risk_count: 0,
        },
        {
          month: "2026-06",
          student_count: 2,
          class_count: 2,
          student_class_month_count: 1,
          expected_sessions: 10,
          recorded_sessions: 6,
          chargeable_sessions: 5,
          actual_sessions: 5,
          actual_present_rate: 80,
          chargeable_rate: 50,
          record_completion_rate: 60,
          fee_amount: 1000000,
          fee_review_count: 1,
          risk_count: 1,
        },
      ],
      classes: [
        {
          class_id: "class-a",
          class_name: "Starter A1",
          student_count: 2,
          class_count: 1,
          student_class_month_count: 2,
          expected_sessions: 18,
          recorded_sessions: 18,
          chargeable_sessions: 17,
          actual_sessions: 18,
          actual_present_rate: 88.9,
          chargeable_rate: 94.4,
          record_completion_rate: 100,
          fee_amount: 1450000,
          fee_review_count: 0,
          risk_count: 0,
        },
        {
          class_id: "class-b",
          class_name: "Mover 3",
          student_count: 1,
          class_count: 1,
          student_class_month_count: 1,
          expected_sessions: 10,
          recorded_sessions: 6,
          chargeable_sessions: 5,
          actual_sessions: 5,
          actual_present_rate: 80,
          chargeable_rate: 50,
          record_completion_rate: 60,
          fee_amount: 1000000,
          fee_review_count: 1,
          risk_count: 1,
        },
      ],
    },
    students: [
      {
        student_id: "student-1",
        student_name: "Phuc",
        class_id: "class-a",
        class_name: "Starter A1",
        month: "2026-05",
        expected_sessions: 10,
        recorded_sessions: 10,
        chargeable_sessions: 10,
        actual_sessions: 10,
        status_counts: {
          present: 10,
          absent_with_fee: 0,
          absent_no_fee: 0,
          holiday: 0,
          make_up: 1,
        },
        actual_present_rate: 100,
        chargeable_rate: 100,
        record_completion_rate: 100,
        monthly_fee_line_id: "line-1",
        monthly_fee_id: "fee-1",
        fee_amount: 500000,
        fee_status: "paid",
        fee_source: "monthly_fee_line",
        fee_confidence: "calculated",
        fee_needs_review: false,
        risk_flags: [],
      },
      {
        student_id: "student-2",
        student_name: "Gau con",
        class_id: "class-b",
        class_name: "Mover 3",
        month: "2026-06",
        expected_sessions: 10,
        recorded_sessions: 6,
        chargeable_sessions: 5,
        actual_sessions: 5,
        status_counts: {
          present: 4,
          absent_with_fee: 1,
          absent_no_fee: 0,
          holiday: 1,
          make_up: 1,
        },
        actual_present_rate: 80,
        chargeable_rate: 50,
        record_completion_rate: 60,
        monthly_fee_line_id: null,
        monthly_fee_id: "fee-2",
        fee_amount: null,
        fee_status: "ready",
        fee_source: "monthly_fee_unallocated",
        fee_confidence: "unallocated_multi_class",
        fee_needs_review: true,
        risk_flags: ["attendance_incomplete", "fee_review"],
      },
    ],
    pagination: {
      page: 1,
      page_size: 50,
      total_items: 2,
      total_pages: 1,
    },
    meta: {
      from: "2026-01",
      to: "2026-06",
      month_count: 6,
      cube_grain: "student_class_month",
      filters: {
        mode: "overview",
        class_id: null,
        student_id: null,
        risk_only: false,
        q: null,
      },
    },
  },
};

async function seedAuth(page) {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem("token", authToken);
    window.localStorage.setItem("refreshToken", "");
  }, token);
}

async function mockAuth(page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: "admin",
            username: "admin",
            role: "admin",
            full_name: "Admin",
          },
        },
      }),
    });
  });
}

async function mockBi(page) {
  const requests = [];
  await page.route("**/api/reports/bi**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const riskOnly = url.searchParams.get("risk_only") === "1";
    const mode = url.searchParams.get("mode") || "overview";
    const keyword = (url.searchParams.get("q") || "").toLowerCase();
    const payload = structuredClone(biPayload);
    payload.data.meta.filters.mode = mode;
    payload.data.meta.filters.risk_only = riskOnly;
    payload.data.meta.filters.q = keyword || null;
    if (riskOnly || mode === "risk") {
      payload.data.students = payload.data.students.filter((row) => row.risk_flags.length);
      payload.data.pagination.total_items = payload.data.students.length;
    }
    if (mode === "attendance") {
      payload.data.students = payload.data.students.filter((row) =>
        (row.risk_flags || []).some((flag) =>
          ["attendance_incomplete", "attendance_over_recorded", "low_present_rate"].includes(flag)
        )
      );
      payload.data.pagination.total_items = payload.data.students.length;
    }
    if (mode === "tuition") {
      payload.data.students = payload.data.students.filter(
        (row) =>
          row.fee_needs_review ||
          row.fee_source === "missing" ||
          !["paid", "confirmed"].includes(row.fee_status || "")
      );
      payload.data.pagination.total_items = payload.data.students.length;
    }
    if (keyword) {
      payload.data.students = payload.data.students.filter((row) =>
        [row.student_name, row.class_name, row.month, ...(row.risk_flags || [])]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      );
      payload.data.pagination.total_items = payload.data.students.length;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
  return requests;
}

async function setup(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/")) errors.push(request.url());
  });
  await seedAuth(page);
  await mockAuth(page);
  const biRequests = await mockBi(page);
  return { errors, biRequests };
}

test("Report Intelligence renders overview charts, table, filters, and drawer", async ({ page }) => {
  const { errors, biRequests } = await setup(page);

  await page.goto("/reports");

  await expect(page.getByText("Report Intelligence")).toBeVisible();
  await expect(page.getByTestId("report-bi-summary")).toContainText("Học viên");
  await expect(page.getByTestId("report-bi-monthly-chart").getByRole("application")).toBeVisible();
  await expect(page.getByTestId("report-bi-class-chart").getByRole("application")).toBeVisible();
  await expect(page.getByTestId("report-bi-fee-funnel").getByRole("application")).toBeVisible();
  await expect(page.getByTestId("report-bi-attendance-distribution").getByRole("application")).toBeVisible();
  await expect(page.getByTestId("report-bi-risk-heatmap")).toBeVisible();
  await expect(page.getByTestId("report-bi-table")).toContainText("Phuc");
  await expect(page.getByTestId("report-bi-table")).toContainText("Mover 3");
  await expect(page.getByTestId("report-bi-tab-content")).toContainText("Tổng quan vận hành");
  await expect.poll(() => biRequests.at(-1)?.searchParams.get("mode")).toBe("overview");

  await page.getByRole("tab", { name: "Chuyên cần" }).click();
  await expect(page.getByTestId("report-bi-tab-content")).toContainText("Phân tích chuyên cần");
  await expect.poll(() => biRequests.at(-1)?.searchParams.get("mode")).toBe("attendance");
  await expect(page.getByTestId("report-bi-table")).not.toContainText("Phuc");
  await expect(page.getByTestId("report-bi-table")).toContainText("Gau con");
  await page.getByRole("tab", { name: "Học phí" }).click();
  await expect(page.getByTestId("report-bi-tab-content")).toContainText("Theo dõi học phí");
  await expect.poll(() => biRequests.at(-1)?.searchParams.get("mode")).toBe("tuition");
  await page.getByRole("tab", { name: "Rủi ro" }).click();
  await expect(page.getByTestId("report-bi-tab-content")).toContainText("Bản đồ rủi ro");
  await expect.poll(() => biRequests.at(-1)?.searchParams.get("mode")).toBe("risk");

  await page.getByRole("checkbox", { name: "Chỉ hiển thị rủi ro" }).check();
  await expect(page.getByTestId("report-bi-table")).not.toContainText("Phuc");
  await expect(page.getByTestId("report-bi-table")).toContainText("Gau con");

  await page.getByRole("searchbox", { name: "Học viên" }).fill("Mover");
  await expect(page.getByTestId("report-bi-table")).toContainText("Gau con");
  await expect.poll(() => biRequests.at(-1)?.searchParams.get("q")).toBe("Mover");

  await page.getByRole("button", { name: "Xem" }).first().click();
  await expect(page.getByRole("heading", { name: "Gau con" })).toBeVisible();
  await expect(page.getByText("Nguồn phí")).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();

  expect(errors).toEqual([]);
});

test("Report Intelligence mobile layout avoids page overflow while keeping the table scrollable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { errors } = await setup(page);

  await page.goto("/reports");

  await expect(page.getByText("Report Intelligence")).toBeVisible();
  await expect(page.getByLabel("Từ tháng")).toBeVisible();
  await expect(page.getByTestId("report-bi-monthly-chart").getByRole("application")).toBeVisible();

  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(pageOverflow).toBe(false);

  const tableOverflow = await page.getByTestId("report-bi-table").evaluate((node) => {
    const scroller = node.querySelector(".overflow-x-auto");
    return Boolean(scroller && scroller.scrollWidth > scroller.clientWidth);
  });
  expect(tableOverflow).toBe(true);
  expect(errors).toEqual([]);
});

test("Report Intelligence initial API failure does not render fake zero analytics", async ({ page }) => {
  await seedAuth(page);
  await mockAuth(page);
  await page.route("**/api/reports/bi**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: { message: "BI unavailable" } }),
    });
  });

  await page.goto("/reports");

  await expect(page.getByTestId("report-bi-error-state")).toContainText("Không tải được dữ liệu báo cáo");
  await expect(page.getByTestId("report-bi-summary")).toHaveCount(0);
});
