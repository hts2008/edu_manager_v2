# Phase 04: Effective Settings And Consumer Parity

Task: TPR-04. Finding: R5 plus R2-R4 consumer integration. Priority: P1.
Status: PENDING. Depends on: TPR-03.
Owners: backend/frontend owners; reviewers: academic owner and QA.
Gate: G04. Tests: TP-CFG-01..05, TP-UI-01..06.

## Objective

Carry tenant/effective-month settings and metric provenance through timeline, list, detail, CSV, print and PDF. This is a correctness integration, not a whole UI redesign.

## Intended Change Surface

- `lib/academic-settings.ts`, `lib/progress-difficulty.ts`, `lib/student-progress-timeline.ts`, `lib/student-progress-report.ts`.
- `server/api/student-progress/timeline.ts`, `server/api/student-progress/pdf.ts`, report handler and shared progress service boundaries.
- `frontend/src/pages/StudentProgressDetailPage.jsx`, `frontend/src/pages/StudentProgressReportPage.jsx`, daily editor, progress input/chart components and relevant frontend service clients.
- `docs/API.md` for actual additive DTO behavior after implementation, existing unit/PDF tests, real Playwright config/specs.

Locate components through imports before editing; avoid changing every file that happens to mention a progress field.

## Work Items

- [ ] TPR-04A: RED fixture raw80/Flyers/Movers/delta0.30 expects performance100, raw80. Pass effective per-month settings into the shared timeline path and PDF.
- [ ] TPR-04B: Resolve each entry's settings/track period, honor finalized snapshots, include relevant cache version and tenant. Test boundaries across months and invalid/absent configuration separately.
- [ ] TPR-04C: Update list/detail charts and daily editor for nullable deltas, source/contributors/coverage. Preserve raw/performance separation and cached-client field compatibility.
- [ ] TPR-04D: Update CSV/print/PDF to the same resolved contract; validate Vietnamese text/font rendering and same-scope expected values.
- [ ] TPR-04E: Test request races when filters/student/month change. Verify receptionist workflow does not fail because auxiliary teacher lookup requires unrelated permission. Preserve validation, loading/error/empty/finalized states.
- [ ] TPR-04F: Extend Playwright discovery and viewport projects; verify390/768/1440px, keyboard use, no overflow and chart points. Use real isolated backend and persisted reload, not mocked API routes.
- [ ] TPR-04G: Update API documentation only to behavior verified as implemented; attach screenshots, export checks and real API/DB evidence.

## Exit Criteria

- [ ] Same scope gives same scores/settings/provenance in API/UI/CSV/PDF; daily-only80 persists through finalize and refresh.
- [ ] Open-month effective config changes affect intended records only; finalized historic values and other tenants remain unchanged.
- [ ] No fabricated zero, negative fake trend, NaN, stale student result or duplicate save.
- [ ] Admin/receptionist permissions verified; unauthorized/finalized edits rejected server-side.
- [ ] All TP-CFG/TP-UI scenarios executed; frontend unit/lint, backend tests/typecheck and build pass.
- [ ] Evidence includes actual test discovery/execution counts; new specs cannot silently miss the runner's testMatch.

Risk: one range-wide config applied to mixed-month evidence, PDF using a parallel formula, UI coercion of null, or race between stale requests and edits. Test these directly rather than checking only source markers.

## Execution Checkpoint - 2026-10-05

Current execution status: REVIEW. Settings/consumer remediation code is implemented locally; original acceptance and G04 remain open.

- [Timeline remediation tests](../../tests/student-progress-timeline-remediation.test.ts) cover effective-month and frozen settings, raw/performance weighting, legacy uncertainty, tenant-scoped loading and invalid stored settings. Main reports focused58/58 overall; this is not a separate all-consumer result.
- [Browser remediation](../../frontend/e2e/tuition-progress-remediation.spec.js) passed3/3 on desktop/mobile/tablet, asserting real login, daily80, null growth, reload, no NaN and overflow bounds. [Real HTTP tests](../../tests/tuition-progress-http.integration.ts) cover receptionist input, wrong/inactive grader denial, effective track/revision parity, stale monthly/daily GET canonical80, committed replace/delete activity and PDF binary/private headers within aggregate14/14, zero skips.
- Still pending: all TP-CFG/TP-UI variants, request-race/error/retry and keyboard/chart checks, cached-client compatibility, CSV/print/PDF value and Vietnamese glyph parity, frontend/static/security/coverage gates and owner review. Three viewport executions of one reload scenario are not full responsive/accessibility acceptance; main captured root533/533 and admin216/216. Frontend125/125 is builder-reported, pending main runner confirmation; receipt links remain with main.
