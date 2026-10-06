# Inline Report Assessments

Status: IMPLEMENTED for local feature scope, 2026-10-06. [Receipt](../../receipts/2026-10-06-inline-report-assessments.md) and [review package](../../docs/artifacts/inline-report-assessments-2026-10-06/README.md). Production release gates remain unchanged.

User authorization: integrate scoring into each learner report row; no separate Update tab or required grading date; automatically record update date and count submissions.

## Contract

- Report becomes default with Overview secondary. Existing visual identity preserved.
- Each current-month learner/class row exposes new assessment score inputs and explicit Update button; successful save refreshes canonical report live.
- A submission appends evidence, never overwrites an earlier same-day homework/assessment. Server determines business date and timestamp in Asia/Ho_Chi_Minh; historical months remain read-only in this new flow.
- One accepted UUID operation is one submission, regardless of skills entered. Legacy evidence counts remain separate; no invented retroactive submission counts.
- Preserve tenant scope, grade/view permissions, assigned active teacher, enrollment validity, finalized-month lock, CAS and Serializable transaction. Durable replay returns original response without double counting.
- No attendance required for homework. Existing dated PATCH/detail workflows remain available for explicit corrections; no schema/dependency/migration changes.

## Cause-Effect And Risks

Replacing date-cell edits with append operations prevents overwrite but requires retry identity and meaningful counters. Reuse canonical monthly rollup and server-owned date; reject month rollover rather than silently write to another month. Preserve dirty drafts across report refresh and guard scope navigation. Do not infer legacy skill evidence is a submission.

## Execution

1. Backend contract and POST/GET submission mode with test-first validation/replay/concurrency safeguards.
2. Tenant-scoped batched report submission count/timestamp projection and tests.
3. Inline editor with zero-safe scores, explicit save, permissions/errors/retry and draft protection.
4. Report integration, two tabs, live canonical refresh; no independent date selector.
5. Unit/type/lint/build, local PostgreSQL/API and browser save/reload evidence; review risks and update workspace records.

## Evidence Gates

Same-day repeated grading appends; multi-skill submission counts once; retry counts once; real zero accepted; invalid scores/tenant/conflict/finalized month rejected; homework no attendance allowed; report average/count/last timestamp refresh and persist after reload. Tests, logs, screenshots and unresolved gaps recorded before completion claims.

All five execution steps verified locally. Pending operations can replay their original receipt across month rollover/finalization, but cannot start new historical submissions. Known month compound-unique races retry the entire transaction at most three times; unrelated uniqueness failures remain failures. Independent review confirmed both safeguards.
