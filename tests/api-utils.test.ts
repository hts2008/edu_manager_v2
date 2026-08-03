import test from "node:test";
import assert from "node:assert/strict";
import {
  getNumber,
  getRequiredString,
  parseMonthRange,
  parseUtcDateRange,
  toDateOnly,
} from "../lib/api-utils.js";
import {
  paymentCreateSchema,
  receiptCreateSchema,
  validateBody,
} from "../lib/validation.js";

test("parseMonthRange returns UTC half-open month bounds", () => {
  const range = parseMonthRange("2026-05");

  assert.equal(range.startDate.toISOString(), "2026-05-01T00:00:00.000Z");
  assert.equal(range.endDate.toISOString(), "2026-06-01T00:00:00.000Z");
});

test("parseMonthRange rejects invalid month format", () => {
  assert.throws(() => parseMonthRange("05-2026"), /month must be YYYY-MM/);
});

test("parseMonthRange rejects out-of-range month numbers", () => {
  assert.throws(() => parseMonthRange("2026-00"), /month must be YYYY-MM/);
  assert.throws(() => parseMonthRange("2026-13"), /month must be YYYY-MM/);
});

test("parseUtcDateRange returns UTC half-open timestamp bounds", () => {
  const range = parseUtcDateRange("2026-05-01", "2026-05-31");
  assert.equal(range.gte?.toISOString(), "2026-05-01T00:00:00.000Z");
  assert.equal(range.lt?.toISOString(), "2026-06-01T00:00:00.000Z");
});

test("parseUtcDateRange rejects impossible and reversed dates", () => {
  assert.throws(() => parseUtcDateRange("2026-02-30"), /from must be YYYY-MM-DD/);
  assert.throws(
    () => parseUtcDateRange("2026-06-02", "2026-06-01"),
    /from must be before or equal to to/,
  );
});

test("query coercion helpers handle arrays and invalid numbers", () => {
  assert.equal(getRequiredString(["student-1"], "student_id"), "student-1");
  assert.equal(getNumber("42"), 42);
  assert.equal(getNumber("not-number"), undefined);
});

test("toDateOnly normalizes date-like inputs", () => {
  assert.equal(toDateOnly("2026-05-15T10:20:30.000Z"), "2026-05-15");
  assert.equal(toDateOnly("invalid"), null);
});

test("payment validation coerces amount and rejects invalid categories", () => {
  const body = validateBody(paymentCreateSchema, {
    category: "office",
    amount: "120000",
    recipient_name: "Office supplier",
  });

  assert.equal(body.amount, 120000);
  assert.throws(
    () =>
      validateBody(paymentCreateSchema, {
        category: "bad",
        amount: 1000,
        recipient_name: "A",
      }),
    /Invalid option/
  );
});

test("receipt validation requires month and positive amount", () => {
  const body = validateBody(receiptCreateSchema, {
    student_id: "student-1",
    month: "2026-05",
    days_count: "3",
    amount: "150000",
    payment_method: "cash",
  });

  assert.equal(body.days_count, 3);
  assert.equal(body.amount, 150000);
  assert.throws(
    () =>
      validateBody(receiptCreateSchema, {
        student_id: "student-1",
        month: "May",
        amount: 0,
        payment_method: "cash",
      }),
    /month must be YYYY-MM/
  );
});

test("receipt validation rejects direct positive receipts with zero chargeable sessions", () => {
  assert.throws(
    () =>
      validateBody(receiptCreateSchema, {
        student_id: "student-1",
        month: "2026-05",
        amount: 150000,
        payment_method: "cash",
      }),
    /days_count must be greater than 0/
  );

  const monthlyFeeBody = validateBody(receiptCreateSchema, {
    student_id: "student-1",
    monthly_fee_id: "fee-1",
    month: "2026-05",
    amount: 150000,
    payment_method: "cash",
  });
  assert.equal(monthlyFeeBody.days_count, 0);
  assert.equal(monthlyFeeBody.monthly_fee_id, "fee-1");
});
