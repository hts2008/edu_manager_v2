import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  canonicalizeBulkFeePayment,
  hashBulkFeePaymentPayload,
} from "../lib/monthly-fee-lines.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("bounded idempotent monthly fee bulk collection", () => {
  it("deduplicates and sorts line ids before hashing the canonical payload", () => {
    const first = canonicalizeBulkFeePayment({
      line_ids: [" line-b ", "line-a", "line-b"],
      month: "2026-07",
      payment_method: "cash",
      notes: "  July collection  ",
    });
    const second = canonicalizeBulkFeePayment({
      line_ids: ["line-a", "line-b"],
      month: "2026-07",
      payment_method: "cash",
      notes: "July collection",
    });

    assert.deepEqual(first.line_ids, ["line-a", "line-b"]);
    assert.deepEqual(first, second);
    assert.equal(hashBulkFeePaymentPayload(first), hashBulkFeePaymentPayload(second));
  });

  it("rejects empty and over-500 canonical selections", () => {
    assert.throws(
      () => canonicalizeBulkFeePayment({ month: "2026-07", payment_method: "cash", line_ids: [] }),
      /line_ids is required/
    );
    assert.throws(
      () => canonicalizeBulkFeePayment({
        month: "2026-07",
        payment_method: "cash",
        line_ids: Array.from({ length: 501 }, (_, index) => `line-${index}`),
      }),
      /at most 500/
    );
  });

  it("persists actor-scoped idempotency and resumable item state in Prisma", () => {
    const schema = source("prisma/schema.prisma");
    assert.match(schema, /model BulkFeePaymentBatch/);
    assert.match(schema, /@@unique\(\[actorId, idempotencyKey\]\)/);
    assert.match(schema, /model BulkFeePaymentItem/);
    assert.match(schema, /@@unique\(\[batchId, lineId\]\)/);
    assert.match(schema, /monthlyFeeLineId\s+String\?\s+@unique/);
  });

  it("exposes POST replay and GET reconciliation contracts without legacy targets", () => {
    const endpoint = source("server/api/monthly-fees/bulk-pay.ts");
    const status = source("server/api/monthly-fees/bulk-pay/[id].ts");
    const router = source("api/router.ts");

    assert.match(endpoint, /IDEMPOTENCY_KEY_REQUIRED/);
    assert.match(endpoint, /IDEMPOTENCY_KEY_REUSED/);
    assert.match(endpoint, /canonicalizeBulkFeePayment/);
    assert.doesNotMatch(endpoint, /student_ids|fee_ids|resolveLineIdsForTarget/);
    assert.match(endpoint, /bulkFeePaymentItem/);
    assert.match(status, /bulkFeePaymentBatch/);
    assert.match(status, /bulkFeePaymentResponse/);
    assert.match(endpoint, /receipt_ids/);
    assert.match(router, /monthlyFeesBulkPayStatus/);
    assert.match(router, /id === "bulk-pay"/);
  });

  it("isolates activity logging from the committed payment response", () => {
    const endpoint = source("server/api/monthly-fees/bulk-pay.ts");
    assert.match(endpoint, /logActivity[\s\S]*?catch/);
    assert.match(endpoint, /ACTIVITY_LOG_FAILED/);
  });

  it("recovers a batch after response loss even before the batch id was persisted", () => {
    const page = source("frontend/src/pages/FeeCollectionPage.jsx");
    assert.match(page, /saved\?\.idempotency_key/);
    assert.match(page, /saved\?\.payload/);
    assert.match(page, /monthlyFeesService\.bulkPay\(saved\.payload, saved\.idempotency_key\)/);
  });
});
