import { expect, test } from "@playwright/test";
import {
  BULK_PAYMENT_STORAGE_KEY,
  authHeaders,
  expectApiSuccess,
  loginAsAdmin,
  phase4RuntimeRequirements,
  pollBulkPaymentBatch,
  seedAuthenticatedPage,
} from "./helpers/audit-phase4-runtime.js";

const runtime = phase4RuntimeRequirements([
  "E2E_ADMIN_USERNAME",
  "E2E_ADMIN_PASSWORD",
  "E2E_FEE_CLASS_ID",
  "E2E_FEE_MONTH",
]);

test.describe("Audit V2 Phase 4 - Fee Workbench", () => {
  test("bulk-pay is idempotent, reconcilable, and resumes its print queue", async ({
    page,
    request,
  }) => {
    test.skip(!runtime.ready, runtime.reason);

    const {
      E2E_ADMIN_USERNAME: username,
      E2E_ADMIN_PASSWORD: password,
      E2E_FEE_CLASS_ID: classId,
      E2E_FEE_MONTH: month,
    } = runtime.values;
    const { token } = await loginAsAdmin(request, username, password);
    const headers = authHeaders(token);

    const workbenchResponse = await request.get(
      `/api/monthly-fees/workbench?month=${encodeURIComponent(
        month
      )}&class_id=${encodeURIComponent(classId)}&limit=500`,
      { headers }
    );
    const workbenchBody = await expectApiSuccess(
      workbenchResponse,
      "load Fee Workbench fixture"
    );
    const collectable = (workbenchBody.data?.rows || []).filter(
      (row) =>
        row.line_id &&
        ["ready", "confirmed"].includes(row.status) &&
        Number(row.total_amount ?? row.amount ?? 0) > 0 &&
        Number(row.charged_sessions ?? row.total_days ?? 0) > 0
    );
    test.skip(
      collectable.length === 0,
      `Fixture ${classId}/${month} has no collectable class-level fee line`
    );

    const lineIds = collectable.slice(0, 2).map((row) => row.line_id);
    const payload = {
      month,
      line_ids: lineIds,
      payment_method: "cash",
    };
    const idempotencyKey = `audit-v2-phase4-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

    const firstResponse = await request.post("/api/monthly-fees/bulk-pay", {
      headers: authHeaders(token, { "Idempotency-Key": idempotencyKey }),
      data: payload,
    });
    const firstBody = await expectApiSuccess(
      firstResponse,
      "start bulk payment",
      [200, 202]
    );
    expect(firstBody.data?.batch_id).toBeTruthy();
    const completed =
      firstBody.data.status === "completed"
        ? firstBody.data
        : await pollBulkPaymentBatch(
            request,
            token,
            firstBody.data.batch_id
          );
    expect(completed.status).toBe("completed");
    expect(completed.failed || 0).toBe(0);
    expect((completed.paid || 0) + (completed.already_paid || 0)).toBe(
      lineIds.length
    );
    const receiptIds = [
      ...new Set(
        (completed.results || [])
          .map((result) => result.receipt_id)
          .filter(Boolean)
      ),
    ];
    expect(receiptIds.length, "completed batch must create printable receipts").toBeGreaterThan(0);

    const replayResponse = await request.post("/api/monthly-fees/bulk-pay", {
      headers: authHeaders(token, { "Idempotency-Key": idempotencyKey }),
      data: payload,
    });
    const replayBody = await expectApiSuccess(
      replayResponse,
      "replay identical bulk payment"
    );
    expect(replayBody.data.batch_id).toBe(completed.batch_id);
    expect(
      [...new Set((replayBody.data.results || []).map((row) => row.receipt_id).filter(Boolean))].sort()
    ).toEqual([...receiptIds].sort());

    const conflictingResponse = await request.post(
      "/api/monthly-fees/bulk-pay",
      {
        headers: authHeaders(token, { "Idempotency-Key": idempotencyKey }),
        data: { ...payload, payment_method: "transfer" },
      }
    );
    expect(conflictingResponse.status()).toBe(409);
    const conflictingBody = await conflictingResponse.json();
    expect(conflictingBody.error?.code).toBe("IDEMPOTENCY_KEY_REUSED");

    const reconciled = await pollBulkPaymentBatch(
      request,
      token,
      completed.batch_id,
      { attempts: 2, delayMs: 25 }
    );
    expect(reconciled.batch_id).toBe(completed.batch_id);
    expect(reconciled.processed).toBe(reconciled.total);
    expect(reconciled.remaining).toBe(0);

    const refreshedResponse = await request.get(
      `/api/monthly-fees/workbench?month=${encodeURIComponent(
        month
      )}&class_id=${encodeURIComponent(classId)}&limit=500`,
      { headers }
    );
    const refreshedBody = await expectApiSuccess(
      refreshedResponse,
      "refresh paid Fee Workbench"
    );
    const rowsByLine = new Map(
      (refreshedBody.data?.rows || []).map((row) => [row.line_id, row])
    );
    for (const lineId of lineIds) {
      expect(rowsByLine.get(lineId)?.status).toBe("paid");
      expect(rowsByLine.get(lineId)?.receipt_id).toBeTruthy();
    }

    const resumeState = {
      idempotency_key: idempotencyKey,
      payload,
      batch_id: completed.batch_id,
    };
    await seedAuthenticatedPage(page, token, resumeState);

    let resumePosts = 0;
    const pdfRequests = [];
    page.on("request", (outgoing) => {
      if (
        outgoing.method() === "POST" &&
        outgoing.url().includes("/api/monthly-fees/bulk-pay")
      ) {
        resumePosts += 1;
      }
    });
    await page.route("**/api/receipts/*/pdf", async (route) => {
      pdfRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF",
      });
    });

    await page.goto("/fee-collection");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "In phiếu thu" })).toBeVisible();
    await expect(
      page.getByText(`Đã tạo ${receiptIds.length} phiếu thu.`, { exact: false })
    ).toBeVisible();
    expect(resumePosts, "resume must reconcile by GET, never duplicate POST").toBe(0);
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), BULK_PAYMENT_STORAGE_KEY)
      )
      .toBeNull();

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "In tất cả" }).click();
    const popup = await popupPromise;
    await expect.poll(() => pdfRequests.length).toBe(receiptIds.length);
    expect(
      pdfRequests.every((url) =>
        receiptIds.some((receiptId) => url.includes(`/receipts/${receiptId}/pdf`))
      )
    ).toBe(true);
    await popup.close();
  });
});
