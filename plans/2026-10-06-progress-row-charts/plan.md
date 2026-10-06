# Compact Learner Report Charts

Status: IMPLEMENTED locally,2026-10-06. User-directed replacement of Month/Average columns with radar and cumulative evidence charts, score inputs2x2. Parent reviewed existing report endpoint/timeline/dashboard helpers before implementation. [Receipt](../../receipts/2026-10-06-progress-row-charts.md).

## Approach And Risks

Reuse existing raw seven-skill timeline/comparison and cumulative evidence semantics, not academic monthly summaries or invented points. Missing remains null, zero remains a real observation. Month stays in row identity/filter/detail navigation and a compact class caption to distinguish historical rows. Two stable compact unframed charts per row; no redesign of restored style. Read-only projection uses already batched tenant-scoped records, no per-row requests or new dependencies.

1. TDD row timeline projection with identity/month boundaries and missing/zero/prior-calendar-month cases, retaining existing report comparison semantics.
2. Compact radar/current-prior and cumulative AreaChart with visible single-point dot and empty states; score grid2x2.
3. Table integration removes stand-alone Month/Average columns, retains save/refresh/draft guards.
4. Frontend/root/focused tests, lint/typecheck/build, browser real data/render/save refresh; record evidence/limitations.

Cause-effect: charts increase width and row height, so constrain each chart ~220px and editor~180px; table scroll stays contained on narrow screens. Cumulative points measure effort, not average/ability. Canonical report refresh must supply latest chart data after save. No billing/score calculation/schema changes or production rollout.

Verification:frontend222/root536/focused13/realHTTP5 pass; lint/typecheck/build pass. Browser synthetic fixture listening80 submission updated radar3.5->18.8 and cumulative233->313, persisted after reload; count5->6. Desktop two rendered SVG charts, single-point marker opaque; inputs2x2. Mobile effective CSS434px, document434px, table1467px contained in364px scrolling region. User visual acceptance/teacher trial remains separate.
