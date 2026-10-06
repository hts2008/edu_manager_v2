# EDU Manager V2 API

## Local Report Row Chart Projection - 2026-10-06

GET `/api/reports/student-progress` includes `students[].chart_timeline`, reusing existing tenant-scoped progress batch. Shape: canonical daily timeline `days`, `series`, `summary` plus `comparison` with raw seven-skill current/prior-calendar-month values and period boundaries. `days[].cumulative_points` is cumulative evidence effort, not average/ability. Missing skills remain null; real zero remains0. No per-row endpoint requests or score mutation semantics change. This local extension is not a deployment claim.

This document tracks the production API surface served by `api/router.ts`.
The production source of truth is the Vercel Serverless TypeScript API plus Prisma.
The legacy Express backend under `backend/` is an Express reference for comparison and local archaeology only.

## Boundary Rules

- Base URL: `/api`.
- Response envelope: `{ success, data, error }`.
- Frontend boundary fields use snake_case.
- Auth uses `Authorization: Bearer <jwt>`, except login and parent portal login.
- Mutations are audited by the router for authenticated `POST`, `PUT`, `PATCH`, and `DELETE`.
- Production data mutations, migrations, seeds, credential rotation, and destructive correction flows require explicit operator intent.
- `/api/kanban` is reference-only in the Express reference backend and is not exposed by the production Vercel API.

## Production Vercel API Routes

| Route | Notes |
| --- | --- |
| `/api/auth/login` | Login, returns JWT token. |
| `/api/auth/me` | Current authenticated user. |
| `/api/auth/logout` | Logout endpoint for frontend parity. |
| `/api/auth/change-password` | Authenticated password change. |
| `/api/activity-logs` | Audit log list. |
| `/api/admin/settings` | Tenant-scoped effective settings registry and values. |
| `/api/ui-experience` | Authenticated tenant-scoped published UI copy/theme only (`GET`). `PUT` requires `console.experience.edit`, plain-text allowlisted copy keys, bounded theme enums, and `expected_config_version`; publishes both keys atomically with settings revisions. Stale configuration returns 409. |
| `/api/admin/settings/simulate` | Permission-protected, read-only finance/academic setting impact simulation. |
| `/api/admin/system-status` | Admin Console runtime and dependency health summary. |
| `/api/admin/tenants` | Platform Owner tenant lifecycle surface. |
| `/api/admin/permissions` | Tenant role-permission matrix. |
| `/api/admin/features` | Tenant feature-flag configuration. |
| `/api/admin/integrations` | Masked tenant integration configuration; secrets are never returned. |
| `/api/backups` | Backup operations. |
| `/api/bulk-actions` | Bulk archive/delete/restore style operations. |
| `/api/center-settings` | Center configuration. |
| `/api/cron/backup` | Protected cron backup trigger. |
| `/api/cron/monthly-fees` | Protected monthly-fee cron trigger. |
| `/api/fee-reminders` | Reminder preview/config; live send remains disabled until provider and opt-in approval. |
| `/api/import/students` | Student CSV import preview/commit. |
| `/api/students` | Student CRUD/list surface. |
| `/api/student-progress` | Admin/receptionist monthly progress assessment list/upsert. `GET` returns `progress_months`; `POST`/`PUT` updates month metadata and monthly skill snapshot. Finalize/reopen actions remain admin-only. Daily observations must use the dedicated daily route. |
| `/api/student-progress/daily` | Admin/receptionist date-scoped progress input. `GET` returns daily observations and monthly raw-score rollup; `PUT` replaces one selected date idempotently; `DELETE` removes only the selected date. Entries accept optional `exam_set_level` (`starters`, `movers`, `flyers`, `ket`, `pet`), independent `difficulty_level` (`easy`, `medium`, `hard`), `entry_label`, and `graded_by_teacher_id`. |
| `/api/student-progress/roster` | `GET` requires `progress.view` with `class_id`, `month`, `entry_date`, offset and limit (max50; class max500). Returns dated evidence cells, ownership/calibration metadata, canonical monthly score/source and SHA256 evidence version. `PATCH` requires `progress.grade`, exact student/class/date, `expected_evidence_version`, UUID `operation_id`, partial seven-skill `changes` (0-100 or explicit null), optional note and `assessment_context`. Only the evidence creator may edit/delete a unique cell; multiple assessments and finalized months are read-only. Non-attendance evidence requires a contextual note. Serializable transaction rejects stale evidence/rubric/assignment with409; accepted-operation replay is tenant/actor scoped and does not duplicate evidence. No monthly mean is directly edited. |
| `/api/student-progress/timeline` | Admin/receptionist cross-month timeline. Required query: `student_id`, `class_id`, `from`, `to` (`YYYY-MM-DD`). Returns daily evidence, raw/weighted per-skill series, growth summary, finalized flags, and bounded day/week/month granularity. |
| `/api/student-progress/pdf` | Admin/receptionist authenticated A4 parent progress PDF for the same student/class/date range as timeline. Missing scores render as `—`; weighted scores remain display-only. |
| `/api/parents` | Parent CRUD/list surface. |
| `/api/teachers` | Teacher CRUD/list surface. |
| `/api/classes` | Class CRUD/list surface. |
| `/api/attendance` | Attendance list/save. |
| `/api/attendance/bulk` | Bulk attendance actions. |
| `/api/attendance/insights` | Attendance heatmap/summary data. |
| `/api/attendance/month` | Month attendance data. |
| `/api/attendance/calculate-fee` | Attendance-based fee calculation. |
| `/api/attendance-periods` | Attendance period list/lock/unlock. |
| `/api/attendance-periods/:id` | Attendance period detail/update. |
| `/api/class-sessions` | Canonical class-session ledger by class and billing month. |
| `/api/class-sessions/month-plan` | Versioned month-plan read/replace/patch API; `sessions_per_week` is warning-only. |
| `/api/class-sessions/:id` | Read or mutate one unprotected class session with optimistic locking. |
| `/api/reports/advanced` | Advanced reports: revenue trend, teacher utilization, retention/cohort. |
| `/api/reports/bi` | Report Intelligence cube at student-class-month grain with attendance, tuition, risk flags, charts, pagination, and metric definitions. |
| `/api/reports/dashboard` | Dashboard summary. |
| `/api/reports/finance-dashboard` | Finance dashboard summary. |
| `/api/reports/financial` | Financial reports with receipts, payments, categories, and summary. |
| `/api/reports/student-fees` | Student fee ledger/anomaly report. |
| `/api/reports/student-progress` | Admin/receptionist monthly parent-facing progress report using student-class-month evidence. Rows include daily average/latest/delta/count, last entry date, and a >15% decline alert against the prior period. |
| `/api/reports/unpaid-students` | Unpaid students by month. |
| `/api/receipts` | Receipt list/create. |
| `/api/receipts/:id` | Receipt detail/delete. |
| `/api/receipts/:id/pdf` | Receipt PDF. |
| `/api/receipts/:id/correct` | Admin correction action; requires explicit reason. |
| `/api/payments` | Payment list/create. |
| `/api/payments/:id` | Payment detail/delete. |
| `/api/payments/:id/pdf` | Payment PDF. |
| `/api/parent-portal/login` | Parent portal login. |
| `/api/parent-portal/logout` | Revoke the current parent portal session. |
| `/api/parent-portal/me` | Parent portal current read-only data. |
| `/api/recycle-bin` | Soft-delete/recycle-bin operations. |
| `/api/templates` | Template list/create. |
| `/api/templates/upload` | Legacy upload route. |
| `/api/templates/upload-image` | Template Designer base64 image upload. |
| `/api/templates/default/:type` | Default template by receipt/payment type. |
| `/api/templates/:id/set-default` | Set template default. |
| `/api/templates/:id` | Template detail/update/delete. |
| `/api/users` | Admin user list/create. |
| `/api/users/:id/reset-password` | Admin password reset. |
| `/api/users/:id` | Admin user update/deactivate/delete. |
| `/api/monthly-fees` | Monthly-fee list. |
| `/api/monthly-fees/calculate` | Calculate/upsert a monthly fee. |
| `/api/monthly-fees/generate` | Dry-run or generate monthly fees. |
| `POST /api/monthly-fees/bulk-pay` | Bounded idempotent collection for up to 500 unique `line_ids`. Requires `Idempotency-Key`; accepts snake_case `month`, `payment_method`, optional `template_id`/`notes`. Reusing the same actor/key/hash resumes or replays the persisted batch; a different hash returns `409 IDEMPOTENCY_KEY_REUSED`. Responses are `200` when completed or `202` while more persisted items remain. |
| `GET /api/monthly-fees/bulk-pay/:batch_id` | Reconcile an actor-owned batch and restore persisted item results plus `receipt_ids` for the print queue. |
| `/api/monthly-fees/workbench` | Fee Workbench per-class line ledger. |
| `/api/monthly-fees/:id/confirm` | Confirm a fee. |
| `/api/monthly-fees/:id/pay` | Pay a fee. |
| `/api/monthly-fees/:id/cancel` | Return confirmed fee to ready state. |
| `/api/monthly-fees/:id` | Monthly-fee detail. |

## Express Reference

### Tuition/Progress TP-1 Local Candidate

Current local implementation, not deployed certification:

- Per-session surcharge uses the per-session rate. Monthly derived surcharge requires a valid regular-slot denominator; unsupported monthly `per_session_fee` without an independent rate returns `409 EXTRA_SESSION_RATE_REQUIRED`. Invalid stored finance/academic settings fail closed rather than silently applying fallback billing/scoring policy.
- Progress responses preserve `null` for missing scores and expose `score_source`: `manual_monthly`, `daily_raw`, `operational_proxy`, `missing`, or `legacy_unknown`. Month snapshot `rubric_snapshot.scoreEvidence` carries formula version, value, contributors and comparison signature. The legacy NOT NULL database score column uses an internal zero sentinel only when metadata says missing; clients must use the nullable DTO.
- Open monthly/daily reads derive current scores from evidence; finalized values/rubric snapshots remain unchanged. Daily DTO includes `track_key`. Manual zero is valid; daily skill fallback does not enter the manual blend.
- Monthly trends use the immediately preceding calendar month, even outside the visible filter. Source/formula/track/calibration/contributor changes suppress deltas with explicit reasons. Timeline aggregate comparisons also require matching observation proportions; unknown performance weighting suppresses weighted comparisons. Whole-month alerts use the prior calendar month; custom windows use the equal-duration preceding window.
- Save/finalize/reopen/daily writes use Serializable transactions with bounded conflicts; revisions and progress audit logs are persisted in the same transaction. Grader assignment/status is rechecked inside the daily transaction.
- Settings preview commits send `expectedConfigVersion` (or `expected_config_version`) from the accepted simulation. An atomic tenant version claim rejects stale commits with `409 SETTING_CONFIG_CONFLICT` before setting/revision/audit writes. Version zero is valid; legacy clients without the optional precondition remain compatible.

Contract and remaining release gaps: [production-readiness docs](production-readiness/tuition-progress/README.md).

The Express reference backend remains useful for parity checks and historical behavior review.
It is not the production runtime. Any new production route must be added to `api/router.ts`, documented here, and covered by tests.
# Inline Progress Submission Extension (2026-10-06)

`GET /api/student-progress/roster?mode=submission&student_id=...&class_id=...&month=YYYY-MM` requires `progress.view`. Returns one current-month row, server-owned `entry_date`, evidence version and submission count. Client dates are not accepted in this mode.

`POST /api/student-progress/roster` requires `progress.grade`. Strict body: `student_id`, `class_id`, current `month`, `expected_evidence_version`, UUID `operation_id`, nonempty `scores` (supported skill keys, numeric0..100), optional plain-text `note` and `assessment_context`. Each accepted operation appends evidence and recomputes canonical rollup atomically; multiple skills count as one submission. Zero is valid. Homework does not require attendance.

Server uses Asia/Ho_Chi_Minh business date and returns `row`, `entry_date`, `submitted_at`, `submission_count`. Exact actor/tenant-scoped UUID retries replay the stored response; changed payload with reused UUID is rejected. Enrollment/grader eligibility, tenant scope, CAS and finalized-month locks remain. New entries in historical months are rejected; old GET/PATCH dated correction contracts are unchanged.

Report rows expose `assessment_submission_count`, `last_submission_at` and `is_finalized`; legacy evidence counts remain distinct. Prior-month comparison rows are excluded from visible report results.
