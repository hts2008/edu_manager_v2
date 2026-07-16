import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  getAttendanceWeekMetadataState,
  getAttendanceWeekMonthKeys,
  getEditableAttendanceDates,
} from "../src/components/attendance/attendanceReadiness.js";

const boundaryDates = [
  "2026-06-29",
  "2026-06-30",
  "2026-07-01",
  "2026-07-02",
  "2026-07-03",
  "2026-07-04",
  "2026-07-05",
].map((dateStr) => ({ dateStr }));
const attendancePage = readFileSync(
  new URL("../src/pages/AttendancePage.jsx", import.meta.url),
  "utf8",
);

function loadedMonth(period) {
  return {
    periodLoaded: true,
    readinessLoaded: true,
    planLoaded: true,
    period,
    readiness: { expected_regular_sessions: 8 },
    plan: { state: "open", version: 1 },
  };
}

describe("cross-month attendance week safety", () => {
  it("requires both June and July metadata before enabling a boundary week", () => {
    assert.deepEqual(getAttendanceWeekMonthKeys(boundaryDates), ["2026-06", "2026-07"]);

    const metadata = {
      "2026-06": loadedMonth({ id: "period-june", status: "open" }),
    };
    const state = getAttendanceWeekMetadataState(boundaryDates, metadata);

    assert.equal(state.ready, false);
    assert.deepEqual(state.pendingMonths, ["2026-07"]);
    assert.deepEqual(
      getEditableAttendanceDates(
        boundaryDates,
        {
          "2026-06": { status: "open" },
          "2026-07": { status: "open" },
        },
        metadata,
      ),
      [],
    );
  });

  it("fails closed for incomplete metadata but treats a fully loaded missing period as a draft", () => {
    const incompleteMetadata = {
      "2026-06": loadedMonth({ id: "period-june", status: "open" }),
      "2026-07": {
        ...loadedMonth({ id: "period-july", status: "open" }),
        readinessLoaded: false,
        readiness: null,
      },
    };
    assert.equal(
      getAttendanceWeekMetadataState(boundaryDates, incompleteMetadata).ready,
      false,
    );
    assert.deepEqual(
      getEditableAttendanceDates(boundaryDates, {}, incompleteMetadata),
      [],
    );

    const metadataWithMissingPeriod = {
      "2026-06": loadedMonth({ id: "period-june", status: "open" }),
      "2026-07": loadedMonth(null),
    };
    const state = getAttendanceWeekMetadataState(
      boundaryDates,
      metadataWithMissingPeriod,
    );

    assert.equal(state.ready, true);
    assert.deepEqual(state.missingPeriodMonths, ["2026-07"]);
    assert.deepEqual(
      getEditableAttendanceDates(
        boundaryDates,
        {
          "2026-06": { status: "open" },
          "2026-07": { status: "open" },
        },
        metadataWithMissingPeriod,
      ).map(({ dateStr }) => dateStr),
      boundaryDates.map(({ dateStr }) => dateStr),
    );

    const mixedStatusMetadata = {
      "2026-06": loadedMonth({ id: "period-june", status: "open" }),
      "2026-07": loadedMonth({ id: "period-july", status: "locked" }),
    };
    assert.deepEqual(
      getEditableAttendanceDates(
        boundaryDates,
        {
          "2026-06": { status: "open" },
          "2026-07": { status: "locked" },
        },
        mixedStatusMetadata,
      ).map(({ dateStr }) => dateStr),
      ["2026-06-29", "2026-06-30"],
    );
  });

  it("keeps a fully loaded open June/July week editable", () => {
    const periods = {
      "2026-06": { id: "period-june", status: "open" },
      "2026-07": { id: "period-july", status: "open" },
    };
    const metadata = {
      "2026-06": loadedMonth(periods["2026-06"]),
      "2026-07": loadedMonth(periods["2026-07"]),
    };

    assert.equal(getAttendanceWeekMetadataState(boundaryDates, metadata).ready, true);
    assert.deepEqual(
      getEditableAttendanceDates(boundaryDates, periods, metadata),
      boundaryDates,
    );
  });

  it("loads period, readiness, and plan metadata before publishing a ready week", () => {
    const loadWeekBranch = attendancePage.slice(
      attendancePage.indexOf("const loadWeekAttendance"),
      attendancePage.indexOf("const handleWeekClick"),
    );

    assert.match(loadWeekBranch, /attendancePeriodsService\.getAll/);
    assert.match(loadWeekBranch, /attendancePeriodsService\.getLockPreflight/);
    assert.match(loadWeekBranch, /classSessionsService\.getMonthPlan/);
    assert.match(loadWeekBranch, /setWeekMonthMetadata\(metadataMap\)/);
    assert.match(loadWeekBranch, /setLoadedWeekKey\(nextWeekKey\)/);
    assert.ok(
      loadWeekBranch.indexOf("setWeekMonthMetadata(metadataMap)") <
        loadWeekBranch.indexOf("setLoadedWeekKey(nextWeekKey)"),
    );
    assert.match(attendancePage, /selectedWeekMetadataState\.ready/);
    assert.match(attendancePage, /Đang tải metadata của tuần/);
    assert.doesNotMatch(attendancePage, /status \|\| "open"/);
  });
});
