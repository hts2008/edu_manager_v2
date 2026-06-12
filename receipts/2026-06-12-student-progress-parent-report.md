# Receipt - Student Monthly Progress Parent Report

**Date:** 2026-06-12
**Workspace:** EDU_MANAGER_V2
**Status:** Implemented, deployed to production, and smoke-tested.

## Scope

Build a monthly parent-facing student progress report for English-center operations. Phase 1 targets Starters, Movers, Flyers, KET/A2 Key, and PET/B1 Preliminary, but only uses real platform data that exists today.

## Research Sources Used

- Cambridge English Young Learners qualification page: Pre A1 Starters, A1 Movers, A2 Flyers are CEFR-aligned and progress from simple English to everyday questions and linked sentences.
- Cambridge English Young Learners results page: certificates use shields per skill; Statement of Results contains shields, strengths, improvement areas, and improvement ideas.
- Cambridge English A2 Key exam format: Reading/Writing 50%, Listening 25%, Speaking 25%.
- Cambridge English B1 Preliminary exam format: Reading, Writing, Listening, and Speaking are each 25%.
- Council of Europe CEFR Companion Volume: official CEFR descriptor reference.
- Cambridge English Scale: consistent score scale for comparing progress across Cambridge qualifications.

## Decision

Do not fabricate academic skill scores from attendance. Phase 1 reports:

- Operational progress score from real attendance/completion/consistency evidence.
- Cambridge track mapping from class names where possible.
- Readiness/risk bands and parent-friendly next actions.
- Skill dimensions as `missing_input` until assessment/rubric data exists.

This keeps parent reports useful now without pretending attendance equals Cambridge shields, CEFR, or Cambridge English Scale results.

## Files Changed

- `plans/2026-06-12-student-progress-parent-report/plan.md`
- `lib/student-progress-report.ts`
- `server/api/reports/student-progress.ts`
- `api/router.ts`
- `docs/API.md`
- `frontend/src/services/api.js`
- `frontend/src/pages/StudentProgressReportPage.jsx`
- `frontend/src/App.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `tests/student-progress-report.test.ts`
- `package.json`
- `KANBAN.md`
- `memory/memory-bank/activeContext.md`
- `memory/memory-bank/decisionLog.md`
- `memory/memory-bank/progress.md`
- `memory/sessions/current-session.md`

## Verification

- `npx tsx --test tests/student-progress-report.test.ts` - pass, 4/4.
- `npx tsc --noEmit` - pass.
- `npm --prefix frontend run lint -- --max-warnings=0` - pass.
- `npm run test:unit` - pass, 65/65.
- `npm run build` - pass; Vite generated `StudentProgressReportPage` chunk.
- `git diff --check` on feature files - pass.
- Local Playwright smoke on `http://127.0.0.1:4321/student-progress` - pass:
  - login via local API,
  - route rendered,
  - `/api/reports/student-progress?from=2026-05&to=2026-06&page_size=5` returned success,
  - response had `summary`, `students`, and framework score note,
  - table actions showed view/print controls,
  - no student-progress API failures and no console errors.
- Vercel production deploy - pass:
  - deployment `dpl_5NZEpgh9xKWqCyp99rt5GxWTLoYs`,
  - ready state `READY`,
  - alias `https://edu-manager-gules.vercel.app`.
- Production Playwright smoke on `https://edu-manager-gules.vercel.app/student-progress` - pass:
  - root 200,
  - no-token `/api/reports/student-progress` returned 401,
  - login succeeded,
  - authenticated `/api/reports/student-progress?from=2026-05&to=2026-06&page_size=5` returned success with summary/students/framework note,
  - route rendered,
  - table view/print actions were visible,
  - no student-progress API failures and no console errors.

## Browser Evidence

- Screenshot: `receipts/artifacts/student-progress-local-smoke.png`
- Production screenshot: `receipts/artifacts/student-progress-production-smoke.png`
- Debug screenshot from first smoke adjustment: `receipts/artifacts/student-progress-debug.png`

## Data Contract

`GET /api/reports/student-progress`

Returns:

- `summary`: counts, average progress/attendance, readiness mix.
- `charts`: monthly progress, Cambridge track distribution, readiness distribution.
- `students`: one row per student-class-month, including:
  - student and parent identity,
  - class and detected Cambridge track,
  - attendance evidence,
  - operational progress score,
  - readiness band,
  - skill score placeholders with `missing_input`,
  - parent summary and next actions.
- `framework`: Cambridge track definitions and explicit score note.
- `pagination` and `meta`.

## Residual Risk

- This is not a formal Cambridge Statement of Results.
- Phase 2 should add real assessment input entities and UI: monthly teacher ratings, skill rubrics, mini-test scores, comments, goals, and printable bilingual report layout.
