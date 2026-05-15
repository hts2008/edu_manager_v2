import test from "node:test";
import assert from "node:assert/strict";
import {
  getNumber,
  getRequiredString,
  parseMonthRange,
  toDateOnly,
} from "../lib/api-utils.js";

test("parseMonthRange returns inclusive month bounds", () => {
  const range = parseMonthRange("2026-05");

  assert.equal(range.startDate.getFullYear(), 2026);
  assert.equal(range.startDate.getMonth(), 4);
  assert.equal(range.startDate.getDate(), 1);
  assert.equal(range.startDate.getHours(), 0);
  assert.equal(range.endDate.getFullYear(), 2026);
  assert.equal(range.endDate.getMonth(), 4);
  assert.equal(range.endDate.getDate(), 31);
  assert.equal(range.endDate.getHours(), 23);
  assert.equal(range.endDate.getMinutes(), 59);
  assert.equal(range.endDate.getMilliseconds(), 999);
});

test("parseMonthRange rejects invalid month format", () => {
  assert.throws(() => parseMonthRange("05-2026"), /month must be YYYY-MM/);
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
