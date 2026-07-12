# EDU Manager V2 API

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
| `/api/backups` | Backup operations. |
| `/api/bulk-actions` | Bulk archive/delete/restore style operations. |
| `/api/center-settings` | Center configuration. |
| `/api/cron/backup` | Protected cron backup trigger. |
| `/api/cron/monthly-fees` | Protected monthly-fee cron trigger. |
| `/api/fee-reminders` | Reminder preview/config; live send remains disabled until provider and opt-in approval. |
| `/api/import/students` | Student CSV import preview/commit. |
| `/api/students` | Student CRUD/list surface. |
| `/api/student-progress` | Admin-only monthly progress assessment list/upsert. `GET` returns `progress_months`; `POST`/`PUT` updates month metadata, narrative, finalization, and monthly skill snapshot. Daily observations must use the dedicated daily route. |
| `/api/student-progress/daily` | Admin-only date-scoped progress timeline. `GET` returns daily observations and monthly rollup; `PUT` replaces one selected date idempotently; `DELETE` removes only the selected date and recomputes the monthly rollup. |
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
| `/api/reports/student-progress` | Monthly parent-facing student progress report using student-class-month attendance/fee evidence plus explicit Cambridge skill-input gaps. |
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

The Express reference backend remains useful for parity checks and historical behavior review.
It is not the production runtime. Any new production route must be added to `api/router.ts`, documented here, and covered by tests.
