import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { pollBulkPaymentBatch } from "../src/utils/bulkPaymentReconciliation.js";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const sidebar = readSource("../src/components/layout/Sidebar.jsx");
const historyPage = readSource("../src/pages/HistoryPage.jsx");
const paymentsPage = readSource("../src/pages/PaymentsPage.jsx");
const receiptsPage = readSource("../src/pages/ReceiptsPage.jsx");
const feeCollectionPage = readSource("../src/pages/FeeCollectionPage.jsx");

describe("finance Phase 3 remediation contracts", () => {
  it("exposes the receipt archive from the finance navigation", () => {
    assert.match(sidebar, /title: "Phiếu thu", icon: "receipt", path: "\/receipts"/);
  });

  it("sends the selected History date range to both list APIs", () => {
    assert.match(historyPage, /const rangeParams = \{ from: dateRange\.from, to: dateRange\.to \}/);
    assert.match(historyPage, /receiptsService\.getAll\(rangeParams\)/);
    assert.match(historyPage, /paymentsService\.getAll\(rangeParams\)/);
  });

  it("renders explicit retryable list errors on all finance archive pages", () => {
    for (const source of [historyPage, paymentsPage, receiptsPage]) {
      assert.match(source, /PageState/);
      assert.match(source, /action=\{load(?:Transactions|Payments|Receipts)\}/);
      assert.match(source, /tone="red"/);
    }
  });

  it("uses project modals instead of native browser confirm or prompt dialogs", () => {
    for (const source of [historyPage, paymentsPage, receiptsPage]) {
      assert.doesNotMatch(source, /window\.(?:confirm|prompt)\s*\(/);
    }
    assert.match(paymentsPage, /ConfirmModal/);
    assert.match(receiptsPage, /ConfirmModal/);
    assert.match(receiptsPage, /correctionReason/);
  });

  it("polls bulk-payment status after the initial POST instead of re-POSTing", () => {
    assert.match(feeCollectionPage, /pollBulkPaymentBatch\(\{/);
    assert.match(feeCollectionPage, /getStatus: monthlyFeesService\.bulkPayStatus/);
    assert.doesNotMatch(
      feeCollectionPage,
      /while \(res\.success && res\.data\.status === 'processing'\)[\s\S]*?monthlyFeesService\.bulkPay\(payload, key\)/,
    );
  });

  it("reconciles a processing batch using status checks only", async () => {
    const statuses = ["processing", "processing", "completed"];
    const calls = [];
    const response = await pollBulkPaymentBatch({
      batchId: "batch-123",
      getStatus: async (batchId) => {
        calls.push(batchId);
        return { success: true, data: { status: statuses.shift() } };
      },
      waitFor: async () => undefined,
      maxPolls: 5,
    });

    assert.equal(response.data.status, "completed");
    assert.deepEqual(calls, ["batch-123", "batch-123", "batch-123"]);
  });

  it("contains no known mojibake or unaccented operational copy", () => {
    assert.doesNotMatch(feeCollectionPage, /KhÃ|thá»|tÃ|Ä‘|Bang hoc phi|Khong the|Dang dong bo|He thong dang|Thu lai|Dang mo/);
  });
});
