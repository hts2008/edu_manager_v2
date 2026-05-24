# EDU_MANAGER_V2 Capability Matrix - 2026-05-18

Source: static audit of `frontend/src/App.jsx`, `frontend/src/pages/*`,
`frontend/src/services/api.js`, `server/api/*`, tests, `PLAN.md`, and three
read-only subagent reviews.

Verdicts:
- `REAL`: UI uses real API, data persists, downstream modules consume it, and
  at least smoke/test evidence exists.
- `PARTIAL`: core path exists but has contract, workflow, evidence, or UX gaps.
- `SHELL`: page renders but lacks real workflow/data linkage.
- `BROKEN`: known 404/500/network/contract failure.

## Route Matrix

| Route | Page | Primary API/service | Verdict | Main gap |
| --- | --- | --- | --- | --- |
| `/login` | `LoginPage.jsx` | `authService.login`, `authService.me` | REAL | Demo credentials still visible; change-password UI needs wiring. |
| `/parent-login` | `ParentPortalLoginPage.jsx` | `parentPortalService.login` | PARTIAL | No rate limit; invalid-login smoke only. |
| `/parent-portal` | `ParentPortalPage.jsx` | `parentPortalService.me` | PARTIAL | Separate request path lacks main timeout/retry handling. |
| `/` | `DashboardPage.jsx` | `reportsService.getDashboard` | BROKEN | UI reads `unpaid_students`; backend did not return it before this plan. |
| `/students` | `StudentsPage.jsx` | `studentsService`, `bulkActionsService` | PARTIAL | CRUD exists; enrollment transaction and write DTO shape need hardening. |
| `/parents` | `ParentsPage.jsx` | `parentsService`, `bulkActionsService` | PARTIAL | CRUD exists; write DTO shape and child linkage need audit. |
| `/classes` | `ClassesPage.jsx` | `classesService`, `teachersService` | PARTIAL | CRUD exists; invalid teacher and raw object response risks. |
| `/teachers` | `TeachersPage.jsx` | `teachersService` | PARTIAL | CRUD exists; direct admin route guard/E2E gaps. |
| `/attendance` | `AttendancePage.jsx` | `attendanceService`, direct fetches | PARTIAL | Locked-period immutability and direct fetch bypass. |
| `/attendance-insights` | `AttendanceInsightsPage.jsx` | `attendanceService.getInsights` | REAL | Read-only analytics; needs broader mobile visual smoke. |
| `/attendance-periods` | `AttendancePeriodsPage.jsx` | `attendancePeriodsService` | PARTIAL | State workflow exists; lock must protect later attendance edits. |
| `/receipts` | `ReceiptsPage.jsx` | `receiptsService`, PDF util | PARTIAL | Direct receipt creation can bypass monthly-fee ledger. |
| `/payments` | `PaymentsPage.jsx` | `paymentsService`, PDF util | PARTIAL | Admin route guard and page-level E2E gaps. |
| `/fee-collection` | `FeeCollectionPage.jsx` | `monthlyFeesService`, PDF util | PARTIAL | Generate/confirm/cancel not fully surfaced; pay concurrency risk. |
| `/history` | `HistoryPage.jsx` | `receiptsService`, `paymentsService` | PARTIAL | No dedicated E2E and PDF/delete recovery checks. |
| `/templates` | `TemplatesPage.jsx` | `templatesService` | REAL | Upload/default methods exist; designer route needs E2E. |
| `/templates/:id/design` | `TemplateDesignerPage.jsx` | `templatesService.getById/update` | PARTIAL | Real designer; no route E2E/mobile evidence. |
| `/reports` | `ReportsPage.jsx` | `reportsService.getFinancial` | PARTIAL | Export/print buttons are shell actions; errors can collapse to zero. |
| `/advanced-reports` | `AdvancedReportsPage.jsx` | `reportsService.getAdvanced` | REAL | Read analytics; keep contract tests. |
| `/audit-logs` | `AuditLogsPage.jsx` | `activityLogsService.getAll` | REAL | Admin route guard gap. |
| `/settings` | `CenterSettingsPage.jsx` | `centerSettingsService` | REAL | Mutating settings exists; production write smoke intentionally avoided. |
| `/users` | `UserManagementPage.jsx` | `usersService` | REAL | Admin route guard and mutation E2E gaps. |
| `/imports` | `ImportPage.jsx` | `importService` | REAL | Native `.xlsx` intentionally deferred. |
| `/fee-reminders` | `FeeRemindersPage.jsx` | `feeRemindersService` | PARTIAL | Send remains provider-gated; UI needs stronger confirmation copy. |
| `/backups` | `BackupsPage.jsx` | `backupsService` | PARTIAL | Public Blob backup posture and irreversible operations need hardening. |
| `/recycle-bin` | `RecycleBinPage.jsx` | `recycleBinService` | REAL | Purge needs stronger irreversible-action UX/test. |

## Critical Findings

1. Several routes used token-only `verifyAuth()` instead of DB-backed
   `requireAuth()`, allowing deactivated users to keep using old JWTs until
   expiry.
2. Locked attendance periods did not prevent later attendance upserts or bulk
   rewrites, so approved fees/reports could become stale.
3. Monthly-fee payment was not idempotent under concurrent requests.
4. Direct receipt creation could mark revenue collected without updating the
   matching monthly-fee ledger.
5. Write responses are inconsistent about snake_case DTOs.
6. Dashboard contract was incomplete.
7. Tests prove broad route presence but miss several full downstream journeys.
8. UX still violates the current design rules in spots: emoji icons, decorative
   gradient blobs, broad `transition-all`, shallow error states, and limited
   mobile overflow/a11y coverage.

## Immediate Fix Queue

1. Convert direct `verifyAuth()` server handlers to DB-backed `requireAuth()`.
2. Add locked-period guard to attendance write paths.
3. Make monthly-fee pay idempotent/conditional.
4. Link direct receipts to matching monthly-fee rows when possible.
5. Add dashboard attention fields from real Prisma data.
6. Add route-level frontend admin protection.
7. Wire change-password modal in the header.
8. Add shared page/error state primitives and use them on critical pages.
9. Replace shell report export/print actions with real CSV/print actions.
10. Expand E2E for dashboard contract, RBAC, parent portal, template designer,
    history, mobile overflow, and PDF.
