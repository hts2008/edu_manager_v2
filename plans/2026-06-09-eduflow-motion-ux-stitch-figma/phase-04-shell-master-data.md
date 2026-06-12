---
phase: 4
title: "Shell, Dashboard And Master Data"
status: implemented
priority: P1
effort: "3-5 days"
dependencies: [3]
---

# Phase 4: Shell, Dashboard And Master Data

## Objective

Apply the chosen system to the most reused surfaces and stabilize the visual language.

## Scope

- MainLayout.
- Sidebar.
- Header.
- Login.
- Dashboard.
- Students.
- Parents.
- Classes.
- Teachers.

## Tasks

1. Implement desktop/mobile shell from Figma.
2. Add navigation state continuity and mobile drawer.
3. Add route progress and active-page feedback.
4. Redesign Dashboard with current real API data only.
5. Normalize list-page structure:
   - Header.
   - Summary metrics.
   - Filter/search bar.
   - DataTable.
   - Bulk action.
   - Empty/error/loading states.
6. Normalize long edit modals:
   - Sticky header/footer.
   - One scroll container.
   - Unsaved-change protection.
   - Mobile full-height sheet.
7. Preserve all existing CRUD and bulk-student functionality.

## Browser Scenarios

- Open every page from sidebar.
- Back/forward restores route and filter state.
- Open every create/edit modal and reach save button.
- Test 390px mobile without horizontal page overflow.
- Slow network still shows meaningful loading.

## Acceptance

- Shell and CRUD pages use shared tokens/components.
- No nested cards or oversized page hero.
- Long modals remain usable at 768px height.
- Existing functional Playwright tests pass.

## Implementation Slice - 2026-06-09

Status: `PARTIAL` with local evidence. This slice migrates the shell-adjacent master-data pages first and keeps the remaining Phase 4 work explicit.

### Implemented

- Added shared `OperationalPage`, `PageIntro`, `MetricGrid`, `MetricTile`, and `ListPanel` scaffolding in `frontend/src/components/ui/OperationalPage.jsx`.
- Migrated Students, Parents, Classes, and Teachers to the same light operational page structure:
  - compact page intro,
  - summary metrics,
  - list panel,
  - existing DataTable/search/bulk/edit flows preserved.
- Added honest API error states with retry for Parents and Teachers instead of silently rendering fake empty data after a failed load.
- Updated Header, Sidebar, and BulkActionBar motion to respect reduced-motion preferences.
- Restored the `/advanced-reports` sidebar entry under the report group.

### Verification

- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 61/61.
- `npm run build` passed.
- `git diff --check` passed with line-ending warnings only.
- Local browser baseline passed 14/14:
  - `docs/artifacts/ux-baseline/local-phase4-shell-master-data/2026-06-09T15-54-53-007Z/`
- Local reduced-motion browser baseline passed 28/28:
  - `docs/artifacts/ux-baseline/local-phase4-shell-master-data-reduced/2026-06-09T15-54-56-105Z/`

### Remaining Phase 4 Work

- Dashboard deeper redesign using the selected EduFlow motion direction.
- Login screen migration to the same design language.
- Long edit modal hardening for unsaved-change protection, focus trap review, and mobile full-height sheet behavior.
- Manual mobile drawer/back-forward route-state review beyond the automated baseline.
- Production deploy and production smoke; this slice is local production-bundle evidence only.

## Implementation Slice - Dashboard/Login/Modal 2026-06-09

Status: `IMPLEMENTED` with local and production browser evidence. This slice closes the next Phase 4 unchecked items for login, dashboard partial failure handling, long edit-modal usability, manual mobile navigation review, and production smoke.

### Implemented

- Rebuilt `frontend/src/pages/LoginPage.jsx` into an EduFlow operational access screen:
  - light premium layout,
  - role/status cards,
  - no visible demo credential block,
  - `ActionProgressButton` submit feedback,
  - retained accessible submit text for existing E2E coverage.
- Hardened `frontend/src/pages/DashboardPage.jsx` so summary data can still render when slower detail widgets fail, while a visible amber retry banner explains the partial state instead of silently ignoring the failure.
- Extended `frontend/src/components/ui/Modal.jsx` with:
  - form snapshot tracking,
  - opt-in unsaved-change confirmation,
  - guarded child cancel buttons via `data-modal-close`,
  - keyboard Tab focus loop,
  - focus restoration,
  - close guard dialog for changed forms.
- Applied `confirmOnClose` and sticky action footers to long edit forms in:
  - `frontend/src/pages/StudentsPage.jsx`,
  - `frontend/src/pages/ParentsPage.jsx`,
  - `frontend/src/pages/ClassesPage.jsx`,
  - `frontend/src/pages/TeachersPage.jsx`.

### Verification

- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 61/61.
- `npm run build` passed.
- Targeted Chrome/Playwright regression `modal-guard.spec.js` passed 3/3:
  - long edit modal `Huy` buttons route through the unsaved-change guard,
  - focus stays inside the dialog while the guard is open,
  - class edit modal remains viewport-bounded on mobile,
  - login renders without the old visible demo credential block,
  - dashboard route renders after auth.
- Local browser baseline passed 12/12:
  - `docs/artifacts/ux-baseline/local-phase4-dashboard-login-modal-guarded/2026-06-09T16-57-29-699Z/`
- Local reduced-motion browser baseline passed 24/24:
  - `docs/artifacts/ux-baseline/local-phase4-dashboard-login-modal-guarded-reduced/2026-06-09T16-58-10-058Z/`

### Review Findings Fixed

- `ck:team` explorer finding P1: visible long-form `Huy` buttons bypassed `confirmOnClose` by calling page `onCancel` directly. Fixed by adding modal-level capture for `data-modal-close` buttons and marking all four long form cancel buttons.
- `ck:team` explorer finding P2: Modal open/cleanup effect depended on `busy`, so confirm activity could rerun body-overflow/focus restoration while the modal was still open. Fixed by moving `busy` and `confirmOnClose` into refs and limiting open/cleanup side effects to `isOpen`.

### Browser Note

The `/login` route produces `redirected_to_login` warnings in the generic UX baseline script because the script normally treats landing on `/login` as a protected-route redirect. For this slice `/login` was intentionally included as a target page; the run still exited successfully and had zero console, API, page, overflow, blank, or read-only failures.

### Remaining Phase 4 Work

- None for this phase. Continue visual normalization for attendance/finance/reports in Phase 5.

## Production Closeout - 2026-06-09

- Vercel production deploy completed:
  - deployment `dpl_9qWTHirrZpVktfNh5W3wcaHRZX5V`
  - inspect URL `https://vercel.com/hts2008s-projects/edu-manager/9qWTHirrZpVktfNh5W3wcaHRZX5V`
  - alias `https://edu-manager-gules.vercel.app`
- Production `modal-guard.spec.js` passed 3/3:
  - `docs/artifacts/playwright/modal-guard-phase4-production/`
- Production browser baseline passed 12/12:
  - `docs/artifacts/ux-baseline/production-phase4-dashboard-login-modal-guarded/2026-06-09T17-11-14-311Z/`
- Production reduced-motion browser baseline passed 24/24:
  - `docs/artifacts/ux-baseline/production-phase4-dashboard-login-modal-guarded-reduced/2026-06-09T17-12-28-101Z/`
- Production mobile drawer/back-forward probe passed and captured:
  - `docs/artifacts/ux-baseline/production-phase4-mobile-drawer-back-forward.png`
- No Prisma migration, seed, or production data mutation was run. Modal guard tests only edited fields in the browser and discarded changes without submitting.
