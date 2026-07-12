import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateTuitionV3,
  type TuitionSlot,
} from "../lib/tuition-v3.js";

const flyerB2Plan = {
  mode: "monthly_prorated" as const,
  monthlyAmount: 900_000,
};

function regularSlots(dates: string[]): TuitionSlot[] {
  return dates.map((date) => ({
    id: `regular-${date}`,
    date,
    kind: "regular",
    status: "present",
  }));
}

describe("Tuition V3 slot ledger", () => {
  it("matches the Flyer B2 June, July, and August 2026 ledgers", () => {
    const scenarios = [
      {
        month: "2026-06",
        dates: ["2026-06-01", "2026-06-03", "2026-06-05", "2026-06-08", "2026-06-10", "2026-06-12", "2026-06-15", "2026-06-17", "2026-06-19", "2026-06-22", "2026-06-24", "2026-06-26", "2026-06-29"],
      },
      {
        month: "2026-07",
        dates: ["2026-07-01", "2026-07-03", "2026-07-06", "2026-07-08", "2026-07-10", "2026-07-13", "2026-07-15", "2026-07-17", "2026-07-20", "2026-07-22", "2026-07-24", "2026-07-27", "2026-07-29", "2026-07-31"],
      },
      {
        month: "2026-08",
        dates: ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-10", "2026-08-12", "2026-08-14", "2026-08-17", "2026-08-19", "2026-08-21", "2026-08-24", "2026-08-26", "2026-08-28", "2026-08-31"],
      },
    ];

    for (const scenario of scenarios) {
      const result = calculateTuitionV3({
        month: scenario.month,
        plan: flyerB2Plan,
        slots: regularSlots(scenario.dates),
      });
      assert.equal(result.ok, true);
      if (!result.ok) continue;
      assert.deepEqual(
        {
          month: result.month,
          planned: result.summary.plannedRegularSlots,
          charged: result.summary.chargedRegularSlots,
          total: result.totalAmount,
        },
        {
          month: scenario.month,
          planned: scenario.dates.length,
          charged: scenario.dates.length,
          total: 900_000,
        },
      );
    }
  });

  it("prorates from the original regular slot dates for a mid-month enrollment", () => {
    const result = calculateTuitionV3({
      month: "2026-07",
      plan: flyerB2Plan,
      enrollment: { startDate: "2026-07-15" },
      slots: regularSlots(["2026-07-01", "2026-07-03", "2026-07-06", "2026-07-08", "2026-07-10", "2026-07-13", "2026-07-15", "2026-07-17", "2026-07-20", "2026-07-22", "2026-07-24", "2026-07-27", "2026-07-29", "2026-07-31"]),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.summary.plannedRegularSlots, 14);
    assert.equal(result.summary.eligibleRegularSlots, 8);
    assert.equal(result.totalAmount, 514_286);
  });

  it("charges present and absent_with_fee, while waiving absent_no_fee", () => {
    const slots = regularSlots(["2026-06-01", "2026-06-03", "2026-06-05"]);
    slots[1].status = "absent_with_fee";
    slots[2].status = "absent_no_fee";
    const result = calculateTuitionV3({ month: "2026-06", plan: flyerB2Plan, slots });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.summary.chargedRegularSlots, 2);
    assert.equal(result.totalAmount, 600_000);
  });

  it("credits center cancellation and holiday unless replaced in the same month", () => {
    const slots = regularSlots(["2026-06-01", "2026-06-03", "2026-06-05"]);
    slots[1].status = "center_cancelled";
    slots[2].status = "holiday";
    slots.push({
      id: "makeup-june-09",
      date: "2026-06-09",
      kind: "makeup",
      status: "present",
      replacesSlotId: "regular-2026-06-03",
    });
    const result = calculateTuitionV3({ month: "2026-06", plan: flyerB2Plan, slots });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.summary.chargedRegularSlots, 2);
    assert.equal(result.totalAmount, 600_000);
    assert.equal(result.ledger.find((row) => row.id === "regular-2026-06-03")?.disposition, "charged_replaced_same_month");
  });

  it("does not let a cross-month makeup alter the current month charge", () => {
    const result = calculateTuitionV3({
      month: "2026-07",
      plan: flyerB2Plan,
      slots: [
        ...regularSlots(["2026-07-01", "2026-07-03"]),
        { id: "makeup-for-june", date: "2026-07-02", kind: "makeup", status: "present", replacesSlotId: "regular-2026-06-29", originalRegularDate: "2026-06-29" },
      ],
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.summary.chargedRegularSlots, 2);
    assert.equal(result.totalAmount, 900_000);
    assert.equal(result.ledger.find((row) => row.id === "makeup-for-june")?.amount, 0);
  });

  it("includes extra slots by default and supports an explicit surcharge", () => {
    const baseSlots: TuitionSlot[] = [
      ...regularSlots(["2026-08-03", "2026-08-05"]),
      { id: "extra-1", date: "2026-08-08", kind: "extra", status: "present" },
    ];
    const included = calculateTuitionV3({ month: "2026-08", plan: flyerB2Plan, slots: baseSlots });
    const surcharged = calculateTuitionV3({
      month: "2026-08",
      plan: flyerB2Plan,
      slots: baseSlots.map((slot) => slot.kind === "extra"
        ? { ...slot, extraFeeMode: "surcharge" as const }
        : slot),
      extraSurchargePerSlot: 75_000,
    });

    assert.equal(included.ok && included.totalAmount, 900_000);
    assert.equal(surcharged.ok && surcharged.totalAmount, 975_000);
  });

  it("supports per_session billing without charging replacement makeups twice", () => {
    const result = calculateTuitionV3({
      month: "2026-06",
      plan: { mode: "per_session", sessionAmount: 120_000 },
      slots: [
        { id: "r1", date: "2026-06-01", kind: "regular", status: "present" },
        { id: "r2", date: "2026-06-03", kind: "regular", status: "absent_with_fee" },
        { id: "r3", date: "2026-06-05", kind: "regular", status: "absent_no_fee" },
        { id: "m1", date: "2026-06-06", kind: "makeup", status: "present", replacesSlotId: "r3" },
      ],
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.totalAmount, 360_000);
  });

  it("returns a typed failure for a monthly plan with zero regular slots", () => {
    const result = calculateTuitionV3({
      month: "2026-06",
      plan: flyerB2Plan,
      slots: [{ id: "extra", date: "2026-06-02", kind: "extra", status: "present" }],
    });

    assert.deepEqual(result, {
      ok: false,
      error: {
        code: "ZERO_PLANNED_REGULAR_SLOTS",
        message: "monthly_prorated requires at least one regular slot in the billing month",
        month: "2026-06",
      },
    });
  });

  it("produces a deterministic ledger snapshot regardless of input order", () => {
    const slots: TuitionSlot[] = [
      { id: "b", date: "2026-06-03", kind: "regular", status: "absent_with_fee" },
      { id: "a", date: "2026-06-01", kind: "regular", status: "present" },
      { id: "x", date: "2026-06-02", kind: "extra", status: "present" },
    ];
    const forward = calculateTuitionV3({ month: "2026-06", plan: flyerB2Plan, slots });
    const reverse = calculateTuitionV3({ month: "2026-06", plan: flyerB2Plan, slots: [...slots].reverse() });

    assert.deepEqual(forward, reverse);
    assert.equal(forward.ok, true);
    if (!forward.ok) return;
    assert.deepEqual(forward.ledger.map(({ id, disposition }) => [id, disposition]), [
      ["a", "charged"],
      ["x", "included_extra"],
      ["b", "charged"],
    ]);
  });
});
