# EDU_MANAGER_V2 Deep Codebase Review

**Review date:** 2026-07-10
**Reviewed commit:** `191aca9` (`main`)
**Scope:** requirements, architecture, auth/security, attendance, tuition and receipts, student progress, templates/PDF, reporting, backup/recovery, tests, CI, deployment and documentation
**Mode:** read-only application review; no production mutation, schema change, deploy or app-code fix was performed

## Executive Verdict

The repository has a healthy static baseline: unit tests, type-check, lint, Prisma validation, production build and dependency audits pass. It also contains substantial real functionality rather than a UI-only shell.

It is not yet defensible to call the platform "Production Live without bug". This review found one P0 operational data-loss hazard, ten P1 correctness/security/recovery risks and several P2/P3 gaps. The most important mismatch is that historical KANBAN entries and mocked browser tests overstate the safety of destructive seed, backup/restore, exact template printing, per-class fee invariants and finalization workflows.

## Verification Evidence

| Gate | Result |
| --- | --- |
| `git status --short` | clean before review artifacts |
| `npm run test:unit` | 107/107 pass |
| `npx tsc --noEmit` | pass |
| `npm --prefix frontend run lint -- --max-warnings=0` | pass |
| `npx prisma validate` | pass |
| `npm run build` | pass; 2,954 Vite modules |
| root `npm audit --audit-level=moderate` | 0 vulnerabilities |
| frontend `npm audit --audit-level=moderate` | 0 vulnerabilities |
| CI-selected Playwright suite | 5/5 pass against Vite preview |
| `npx prisma migrate status` | exit 1; no migrations; DB not managed by Prisma Migrate |
| live root/header probes | HTTP 200; default `lang=en`, Vite favicon/title; no CSP |
| live no-token `/api/auth/me` | HTTP 401 as expected |
| schedule normalization probe | numeric `[2,4] -> [1,3]`; labels `["T2","T4"] -> [0,2]` (wrong) |
| backup coverage probe | 19 Prisma models; only 14 exported |

## Findings

### CR-01 [P0] The production seed command can partially erase the database

`prisma/seed.ts:120-131` executes a sequence of destructive `deleteMany()` calls outside a transaction. It removes attendance and enrollments first, then attempts to delete receipts, students, classes and users. The list predates `MonthlyFeeLine`, `ReceiptLine` and all student-progress models. With current foreign keys, a later delete can fail after earlier tables have already been emptied. `package.json:15` exposes this as the ordinary `npm run db:seed` command, and `KANBAN.md` still presents it in Quick Start.

**Impact:** one mistaken production invocation can leave attendance/enrollment data deleted while financial/progress data remains partially linked. There is no atomic rollback.

**Required remediation:** split local demo reset from production bootstrap; require `ALLOW_DESTRUCTIVE_SEED=true`, reject known production/Neon hosts, wrap reset in a transaction or local-only truncate, make the production bootstrap idempotent and add a CI test that production-like env values refuse to run.

### CR-02 [P1] Backup is incomplete, has no restore path and couples encryption to JWT rotation

`lib/backup.ts:52-100` exports 14 of 19 Prisma models. It omits `MonthlyFeeLine`, `ReceiptLine`, `StudentProgressMonth`, `StudentProgressSkill` and `StudentProgressDailyEntry`. `server/api/backups/index.ts:25-33` supports only run/verify; verify decrypts metadata but does not restore. `lib/backup.ts:8-17` falls back to `JWT_SECRET`, so rotating JWT can make historical backups unreadable. `KANBAN.md:474` nevertheless marks "Weekly DB backup and restore drill" implemented.

**Impact:** a successful cron/verify response cannot recover class-level financial history or student progress, and no restore drill exists.

**Required remediation:** export every model or use Neon/PITR-native backups; use a dedicated versioned backup key; implement restore into an isolated branch/database; validate row counts and relational checksums; document RPO/RTO and run a quarterly restore drill.

### CR-03 [P1] Authentication fails open on missing secret and has no real revocation lifecycle

`lib/auth.ts:6`, `server/api/auth/login.ts:13` and `lib/parent-auth.ts:5` all fall back to the public string `your-secret-key`. Staff tokens last eight hours (`server/api/auth/login.ts:90-92`) and parent tokens seven days (`lib/parent-auth.ts:18-21`). Logout only writes an activity log (`server/api/auth/logout.ts:18-20`); password change only updates the hash (`server/api/auth/change-password.ts:57-65`), so existing tokens remain valid. The frontend stores bearer tokens in `localStorage` (`frontend/src/context/AuthContext.jsx:14,54-58`) and production serves no Content-Security-Policy. It also writes an undefined refresh token although login does not return one.

`frontend/src/context/AuthContext.jsx:35-47` deletes the token for any `/auth/me` failure, including a transient timeout or 500, causing avoidable user logout.

**Impact:** a missing env var becomes complete auth bypass; XSS can steal long-lived tokens; stolen tokens survive logout/password change; temporary outages log users out.

**Required remediation:** fail startup when secrets are absent/weak; introduce `tokenVersion` or `passwordChangedAt`; rotate/revoke sessions on logout/password reset; prefer HttpOnly Secure SameSite cookies or short-lived access plus rotated refresh tokens; add CSP; clear sessions only for verified 401 token failures.

### CR-04 [P1] Template Designer output cannot render faithfully to PDF

The designer uploads to public Vercel Blob and stores the URL in Fabric JSON (`frontend/src/pages/TemplateDesignerPage.jsx:865-917`, `lib/storage.ts:35-41`). The PDF renderer accepts only PNG/JPEG base64 data URLs and silently drops URL images (`lib/pdf.ts:308-317`). The renderer also sorts Fabric objects and emits sequential pdfmake content (`lib/pdf.ts:283-317`) with a synthetic top margin (`lib/pdf.ts:176-182`), so it cannot preserve absolute coordinates, z-order, overlap, rotation or background layers. This is the direct cause class of previously observed garbled/blank print output.

The E2E mock hides the problem by returning data URLs (`frontend/e2e/template-designer-hardening.spec.js:85-102`), while production returns Blob URLs. `tests/pdf.test.ts:166-193` explicitly accepts skipping unsupported images and does not compare rendered pixels.

**Impact:** the canvas can look correct and save successfully while the printed receipt omits images and rearranges text/shapes.

**Required remediation:** define one rendering contract. Recommended: rasterize non-binding Fabric layers to a page background at save time, preserve binding fields as absolute overlays, fetch only allowlisted Blob assets with size/type limits, then render a pixel-diffed PDF. Add A4/A5/A6/custom golden-image tests and a real upload-save-print E2E.

### CR-05 [P1] Per-class tuition is not enforced as a system invariant

ADR-32 requires one collection row/receipt per student-class-month, but aggregate paths remain live:

- `server/api/monthly-fees/[id]/pay.ts:43-135` pays a whole `MonthlyFee` and creates one aggregate receipt without `ReceiptLine`.
- `server/api/receipts/index.ts:144-246` can create/link an aggregate monthly receipt and mark the full fee paid.
- `frontend/src/pages/ReceiptsPage.jsx:264-320` still calculates and posts `monthly_fee_id`, bypassing class lines.
- `lib/monthly-fee-generator.ts:26-53,156-201` cron-generates aggregate fees but no `MonthlyFeeLine` rows.
- `server/api/parent-portal/me.ts:43-87` exposes aggregate monthly fees, so parents cannot see paid/unpaid status by class.

**Impact:** operators can still merge classes into one payment, line and aggregate statuses can diverge, and portal/report output can contradict Fee Workbench.

**Required remediation:** make `MonthlyFeeLine` the only collectible ledger; reject aggregate pay/create when class lines exist; migrate or explicitly quarantine legacy aggregate rows; make cron create lines transactionally; expose line-level receipts/status to portal and reports.

### CR-06 [P1] Enrollment history cannot represent when a student left and rejoined

`StudentClass` stores one `enrollmentDate` and one current status (`prisma/schema.prisma:204-216`) with no end date or enrollment periods. Reactivation overwrites the original date (`server/api/students/index.ts:373-378`). Reporting creates every month from enrollment onward (`lib/report-cube.ts:519-555`) and keeps an inactive enrollment for the whole requested range if any evidence exists anywhere in that range (`server/api/reports/bi.ts:117-141`; `server/api/reports/student-progress.ts:198-229`).

**Impact:** post-withdrawal months appear as missing/risky, reactivation erases original history, attendance denominators and progress trends become incorrect.

**Required remediation:** add immutable `EnrollmentPeriod(joinedAt,leftAt,status/reason)` history; derive month rows only when the period intersects the month; migrate existing links conservatively; never overwrite historical join dates.

### CR-07 [P1] Student and class-enrollment writes can partially commit or exceed capacity

Student create writes the student first and enrollments second without a transaction (`server/api/students/index.ts:269-293`). Student update mutates the profile and then performs separate enrollment reads/updates/creates (`server/api/students/index.ts:321-390`). Neither path prevalidates every class or capacity. Class bulk enrollment checks count then upserts under default transaction isolation (`server/api/classes/index.ts:15-69,207-244`), so concurrent requests can both pass the capacity check.

**Impact:** a bad class ID can leave an orphaned partial student update; concurrent enrollments can exceed `maxStudents`; profile and enrollment state can disagree.

**Required remediation:** prevalidate parents/classes/capacity; use one serializable transaction with retry or an advisory lock per class; make student profile and enrollment synchronization atomic; add forced-failure rollback and concurrent-capacity integration tests.

### CR-08 [P1] Parent portal login is brute-forceable and O(total parents)

`server/api/parent-portal/login.ts:24-58` treats phone plus any child's DOB as the credential, loads every parent and child, then searches in JavaScript. It has no rate limit. Successful login returns all siblings. Staff login uses an in-process `Map` (`lib/rate-limit.ts:16-52`), which is neither shared across Vercel instances nor pruned globally.

**Impact:** low-entropy credentials can be guessed, login cost grows with the database, and serverless instances do not share lockout state.

**Required remediation:** store/index normalized phone; use a distributed limiter (Vercel KV/Upstash/Neon table); add OTP or an operator-issued PIN; use generic errors and event/audit alerts; scope returned family data intentionally.

### CR-09 [P1] "Finalized" student progress is still freely mutable

Monthly upsert sets or clears `finalizedAt` as a normal body flag and rewrites all scores (`server/api/student-progress/index.ts:450-529`). Daily PUT deletes/replaces a date and recomputes the month without checking finalization (`server/api/student-progress/daily.ts:296-410`); DELETE does the same (`server/api/student-progress/daily.ts:435-475`). There is no revision number, immutable snapshot, reopen reason or optimistic lock.

**Impact:** a parent report already printed as final can silently change while audit metadata still looks finalized.

**Required remediation:** explicit finalize/reopen endpoints, admin reopen reason, optimistic version, immutable report revision/snapshot, block monthly/daily edits while finalized, and audit every transition.

### CR-10 [P1] Production schema has no migration history or rollback path

There is no `prisma/migrations` directory. `npx prisma migrate status` confirms the Neon database is not managed by Prisma Migrate. The release history uses `prisma db push`, while `package.json:14` exposes a migrate command that has nothing to deploy.

**Impact:** production schema drift is not reviewable, releases cannot reproduce schema state deterministically, and rollback/forward-fix planning is weak.

**Required remediation:** baseline the existing Neon schema, commit migration history, add CI migrate-diff/status, test every migration on an isolated branch and require backup/rollback evidence before production deployment.

### CR-11 [P1] Attendance "unlock" does not actually reopen editing

The API edit guard blocks `submitted`, `approved` and `locked` periods (`lib/attendance-lock.ts:23-40`). Unlock changes only `locked -> approved` (`server/api/attendance-periods/[id]/index.ts:252-275`). The UI disables editing only for `locked` (`frontend/src/pages/AttendancePage.jsx:574-584,1234-1288,1335-1340`) and tells the user the month was reopened (`frontend/src/pages/AttendancePage.jsx:746-752`). Therefore the UI permits edits after unlock but the API rejects the save.

**Impact:** admins see an apparently editable month, change cells, then receive errors; there is no approved/locked-to-open correction path.

**Required remediation:** define explicit `reopen` semantics with reason/audit and financial dependency checks; transition to `open` only when safe, or create a correction version if receipts exist; use one shared `isEditableStatus` contract in UI and API.

### CR-12 [P2] Passing tests provide false confidence for server/data behavior

Many "unit" tests read source files and regex-match strings rather than invoking handlers or Prisma behavior, for example `tests/production-contracts.test.ts:1-67`, `tests/attendance-regressions.test.ts:1-80`, `tests/student-progress-api.test.ts:1-83` and `tests/student-progress-daily-api.test.ts:1-69`. CI starts only a static Vite preview and runs three mocked specs (`.github/workflows/ci.yml:28-56`). Those specs mock auth and every relevant API with `page.route().fulfill()`.

**Impact:** CI cannot detect missing env, database constraints, transaction rollback, auth/RBAC, PDF fidelity, Vercel routing or serverless timeout failures.

**Required remediation:** keep source-contract tests as lint-like guards, but add handler integration tests against an isolated Postgres/Neon branch and Playwright against the real local API router. Require real-backend flows for auth, attendance lock, class-line collect/print, template upload/PDF and progress finalization.

### CR-13 [P2] Bulk collection can time out after partial commits

`server/api/monthly-fees/bulk-pay.ts:399-447` processes every selected target serially and opens one transaction per target; each target may collect multiple lines serially. Fee calculation also performs per-class queries (`:64-89`). The UI permits large page sizes while Vercel caps the function at 30 seconds (`vercel.json:23-26`).

**Impact:** some receipts may commit before a timeout, but the browser receives no complete print queue; retry produces a mixed already-paid/paid result that operators must reconcile.

**Required remediation:** bound synchronous batches, use an idempotency key and persisted batch job/progress, batch attendance aggregation, expose reconciliation by batch ID and test 100/500-line workloads.

### CR-14 [P2] Template uploads trust MIME text and have no size/content controls

`server/api/templates/upload-image.ts:28-41` accepts any `image/*`, decodes unbounded base64 and does not validate magic bytes, dimensions or decompression size. `lib/storage.ts:35-39` publishes the object publicly. SVG is accepted by the frontend input path but is not safely rendered by PDF.

**Impact:** oversized/image-bomb or active SVG payloads can consume resources or become publicly hosted content; accepted assets may still disappear from PDF.

**Required remediation:** cap encoded/decoded size, allowlist PNG/JPEG/WebP, validate signatures and dimensions, reject/sanitize SVG, store asset metadata and test malicious/oversized input.

### CR-15 [P2] Student pagination accepts unbounded and invalid values

`server/api/students/index.ts:19,115-128,151-172,205-215` passes raw `parseInt(limit/offset)` to Prisma with no finite/min/max validation.

**Impact:** authenticated callers can request excessive rows or trigger 500s with malformed parameters.

**Required remediation:** shared pagination schema with `offset >= 0`, default 100 and max 500; return 400 for invalid input.

### CR-16 [P2] Legacy textual weekdays are shifted by one day

`lib/tuition.ts:67-104` maps `T2` to `1`, then treats any set without `0` as one-based and subtracts one. The frontend duplicates the same logic in `frontend/src/utils/dateKeys.js:24-60`. Runtime proof: `["T2","T4"]` normalizes to `[0,2]` (Sunday/Tuesday) instead of `[1,3]` (Monday/Wednesday). Existing tests cover only numeric `[2,4]` (`tests/tuition.test.ts:101-105`).

**Impact:** imported/legacy string schedules miscompute expected sessions, make-up classification and tuition.

**Required remediation:** normalize textual labels directly to final JS weekday values and apply one-based conversion only to originally numeric arrays; share the implementation and add mixed legacy fixtures.

### CR-17 [P2] Generic mutation audit logs failed requests as mutations

`api/router.ts:198-221,246-255` calls `recordMutationAudit` after any resolved handler. Most handlers catch errors and send 4xx/5xx rather than throw, so router audit records `API_POST/PUT/DELETE` even when the response failed. It also uses token-only `verifyAuth`, not the DB-backed active-user check.

**Impact:** audit history can imply that a mutation succeeded when it was rejected or failed.

**Required remediation:** capture response status/outcome; log `attempted/succeeded/failed` separately; use the authenticated user established by the handler/middleware and include request ID/entity where available.

### CR-18 [P2] Default credentials and architecture documentation remain unsafe/stale

`prisma/seed.ts:133-160` creates `admin/admin123` and `nhanvien/staff123`. README publishes different default credentials (`README.md:50-53,122-127`), while `PROJECT_CONTEXT.md:3-19,55-60,162-179` points to the obsolete Delta/Supabase architecture, claims token refresh and 100% completion. Production login with `admin/admin123` was evidenced as recently as 2026-06-09, but was not re-tested in this read-only review because login mutates `lastLogin`.

**Impact:** operators and agents can use the wrong backend/URL/credentials, and a still-active known password would be an account takeover risk.

**Required remediation:** rotate/disable default accounts, require first-login change, remove passwords from docs, replace PROJECT_CONTEXT with current architecture and add a docs freshness gate.

### CR-19 [P3] Core modules are too large to review and test safely

Current line counts include Template Designer 1,675, Attendance 1,444, Student Progress Report 1,368, Reports 1,143, Classes 920, Fee Collection 766, Students 751 and API client 716. This conflicts with the workspace's own god-component rule and has already produced duplicated request logic (`frontend/src/services/api.js:99-139` and `:221-280`).

**Impact:** state races, inconsistent guards and regression tests become harder to reason about.

**Required remediation:** extract domain hooks, state machines, adapters and view sections behind existing behavior tests; do not combine this with business-rule changes.

### CR-20 [P3] Production shell still ships default Vite identity and no frontend CSP

`frontend/index.html:1-7` uses `lang="en"`, `/vite.svg` and title `frontend`. The live root returned the same HTML on 2026-07-10. The root response had HSTS but no CSP.

**Impact:** visible production polish/accessibility defect and weaker XSS containment for localStorage bearer tokens.

**Required remediation:** set Vietnamese locale/product title/favicon/metadata and add a tested CSP compatible with Vite assets and required APIs.

## Requirement Reconciliation

| Requirement / prior decision | Current implementation | Verdict |
| --- | --- | --- |
| One tuition row/receipt per student-class-month | Fee Workbench does this, but legacy aggregate pay/create/cron/portal remain | PARTIAL |
| Template canvas output prints exactly as designed | Canvas works; PDF uses incompatible flow renderer and drops Blob URLs | NOT MET |
| Weekly backup plus restore drill | Encrypted partial export plus metadata verify only | NOT MET |
| Student progress daily history | Date-scoped entries exist | MET, but finalization integrity missing |
| Reopen locked attendance safely | UI/API state rules contradict each other | NOT MET |
| Production schema source of truth and controlled rollout | Prisma schema exists; no migration history | PARTIAL |
| Auth/RBAC production hardening | DB-backed auth wrappers/RBAC exist; secret fallback and revocation gaps remain | PARTIAL |
| CI protects production flows | Static gates are strong; API/DB/PDF E2E is mocked | PARTIAL |

## Remediation Plan

### Wave 0 - Stop-loss before further feature work

1. Disable destructive seed outside explicit local test environments.
2. Rotate default credentials and JWT secret; remove fail-open secret fallbacks.
3. Take a verified Neon-native backup and prove restore into an isolated branch.
4. Mark template custom printing and aggregate receipt creation as unsafe until fixed.

### Wave 1 - Data and workflow invariants

1. Baseline Prisma migrations and establish deploy/rollback procedure.
2. Make class-level fee lines the only collection ledger; migrate/quarantine legacy aggregates.
3. Add enrollment periods and atomic serializable enrollment mutations.
4. Implement exact template/PDF rendering with Blob asset handling and golden visual tests.
5. Add explicit attendance reopen/correction and progress finalize/reopen revisions.
6. Replace parent login and rate limiting with indexed, distributed controls.

### Wave 2 - Quality gates and performance

1. Real API integration tests against isolated Postgres.
2. Real-router Playwright for auth, attendance-lock, collect-print, upload-print and progress-finalize.
3. Idempotent asynchronous/bounded bulk payment processing.
4. Shared validated pagination, upload validation and schedule normalization.
5. Split god components only after behavior tests protect current workflows.

## Required Acceptance Tests

- Seed refuses production-like env and leaves all tables unchanged.
- Backup contains all 19 models; isolated restore produces matching row counts/checksums and opens representative receipt/progress records.
- Missing/weak JWT secret prevents startup; logout/password reset invalidates prior tokens.
- Two simultaneous enroll requests cannot exceed class capacity; forced class-link failure rolls back student creation.
- Student enrollment active Jan-Mar, inactive Apr-May, active Jun produces report rows only for active periods.
- Aggregate receipt/pay endpoint rejects a multi-class fee; each class can be paid and printed on different dates.
- Uploaded Blob image and every Fabric layer appear in rendered PDF at pixel-matched coordinates for A4/A5/A6/custom.
- Unlock/reopen behavior is identical in UI and API, with correction/audit behavior when money is already collected.
- Finalized progress rejects daily/monthly writes until an audited reopen; old printed revision remains reproducible.
- 100/500-line collection test is idempotent, bounded and recoverable after timeout/interruption.

## Strengths Preserved

- `missing_input` is preserved instead of fabricating academic zeroes.
- Protected API routes consistently use auth wrappers; admin-only checks exist for higher-risk modules.
- Class-level fee and receipt-line models already provide the right target architecture.
- Static quality gates and dependency hygiene are currently clean.
- Attendance lock now uses transactional advisory-lock reconciliation and has recent production evidence.

## Review Boundary

No production login, data write, seed, migration, deploy or backup restore was performed. Current default-credential status therefore remains unverified. Context+/Neural Memory workspace MCP tools and Claude TeamCreate were unavailable in this runtime; six authorized explorer attempts failed on helper quota, so all findings were independently rechecked inline against code, tests and safe read-only probes.
