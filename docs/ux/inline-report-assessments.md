# Inline Report Assessments

## Compact Row Charts - 2026-10-06

Standalone Month/Average columns replaced by compact radar7skills and cumulative evidence chart in every row. Four core score fields form2x2grid,180px wide. Chart geometry240x190px; no nested cards. Month retained as class context to distinguish historical rows. Radar uses raw current/prior calendar-month values, preserving report baseline semantics (not the detail dashboard's equal-duration windows). Missing values are disconnected, not drawn as origin0; a real zero remains visible. Single-day cumulative evidence has an opaque marker. Charts refresh with canonical report after Update. See [receipt](../../receipts/2026-10-06-progress-row-charts.md).

## User Workflow

The Progress page defaults to Report, with Overview as the secondary view. Each current-month learner/class row contains new score inputs and an explicit Update action. Empty cells are omitted; a real zero is a valid score. Optional homework, practice, mock-test scores and notes are available within that row. No grading date picker is required.

## Persistence

GET submission context returns the server business date and evidence version. POST appends independent evidence under the current server month. Multiple submissions on the same day remain separate. One accepted operation is one update; entering multiple skills is not multiple updates. Report counters do not fabricate update counts for historical evidence recorded before this workflow.

Asia/Ho_Chi_Minh determines the business date; submitted_at is an ISO timestamp. Historical rows and finalized months cannot receive new entries through this workflow. Explicit historical evidence corrections remain in learner details.

## Safety

Tenant/view/grade permissions, valid enrollment and active assigned grader are required. CAS rejects changed evidence/rubric; finalized-month locks remain. Serializable transactions commit evidence, canonical rollup and replay receipt together. Uncertain network outcomes retry the exact UUID/payload; definite conflicts retain drafts and require a fresh version before another attempt.

Homework grading is allowed without attendance; attendance/billing are not altered. Drafts in other rows must survive live report refresh. Navigation guards protect dirty or pending submissions.

## Verification

Plan: [Inline Report Assessments](../../plans/2026-10-06-inline-report-assessments/plan.md). Receipt and browser evidence record actual completed gates; no production-readiness claim follows from local tests alone.
