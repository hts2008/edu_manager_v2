import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const detailSource = readFileSync(
  new URL("../src/pages/StudentProgressDetailPage.jsx", import.meta.url),
  "utf8",
);
const chartsSource = readFileSync(
  new URL("../src/components/student-progress/ProgressDashboardCharts.jsx", import.meta.url),
  "utf8",
);

describe("student progress fluid layout", () => {
  it("keeps the detail surface fluid and prevents grid children from forcing overflow", () => {
    assert.match(
      detailSource,
      /className="w-full min-w-0 space-y-5" data-testid="student-progress-detail-page"/,
    );
  });

  it("uses one, two, and four KPI columns at mobile, tablet, and desktop widths", () => {
    assert.match(
      detailSource,
      /className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"/,
    );
  });

  it("expands charts from one to two columns at 1280px and four at 2200px", () => {
    assert.match(
      chartsSource,
      /className="grid min-w-0 grid-cols-1 gap-4 min-\[1280px\]:grid-cols-2 min-\[2200px\]:grid-cols-4"/,
    );
    assert.doesNotMatch(chartsSource, /\bxl:grid-cols-2\b/);
  });
});
