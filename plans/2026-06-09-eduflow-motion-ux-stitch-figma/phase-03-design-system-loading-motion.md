---
phase: 3
title: "Design System, Loading And Motion Primitives"
status: implemented
priority: P1
effort: "2-3 days"
dependencies: [2]
---

# Phase 3: Design System, Loading And Motion Primitives

## Objective

Implement the shared visual, motion and async-state foundation before page redesigns.

## Test-First Requirements

1. Add failing tests for route loading visibility.
2. Add failing tests for reduced-motion behavior.
3. Add failing tests for button duplicate-submit prevention.
4. Add failing tests for error replacing endless loading.

## Planned Code

### Create

- `frontend/src/design/tokens.js`
- `frontend/src/design/motion.js`
- `frontend/src/components/ui/AsyncBoundary.jsx`
- `frontend/src/components/ui/RouteProgress.jsx`
- `frontend/src/components/ui/LoadingScene.jsx`
- `frontend/src/components/ui/Skeletons.jsx`
- `frontend/src/components/ui/ActionProgressButton.jsx`
- `frontend/src/components/ui/LongOperationStatus.jsx`

### Modify

- `frontend/src/index.css`
- `frontend/src/App.jsx`
- `frontend/src/components/ui/PageTransition.jsx`
- `frontend/src/components/ui/PageState.jsx`
- `frontend/src/components/ui/DataTable.jsx`
- `frontend/src/components/ui/Modal.jsx`

## Implementation Rules

- Remove contradictory font/token definitions.
- Keep one semantic token system.
- Replace broad gradient/radial page backgrounds with restrained operational surfaces.
- Preserve shell while routes load.
- Use skeleton geometry matching final content.
- Use stale-while-refreshing UX where data cache exists.
- Respect `prefers-reduced-motion`.
- Never animate width, height, top or left.
- No blocking overlay for ordinary data refresh.
- Loading must transition to explicit error after timeout/failure.

## Acceptance

- Shared loading components work with screen readers.
- Route shell does not disappear.
- Reduced-motion test passes.
- No new dependency is added.
- Existing E2E remains green before page migrations begin.

## 2026-06-09 Implementation Evidence

Implemented the production-safe foundation slice:

- Added `frontend/src/components/ui/LoadingStates.jsx` with visible route/auth loading, skeleton blocks, chart frame, and Recharts-safe container props.
- Added `frontend/src/design/tokens.js` and `frontend/src/design/motion.js` for explicit EduFlow async and motion tokens.
- Added `frontend/src/components/ui/AsyncBoundary.jsx`, `RouteProgress.jsx`, `LoadingScene.jsx`, `Skeletons.jsx`, `ActionProgressButton.jsx`, and `LongOperationStatus.jsx`.
- Wired shared route loading in `frontend/src/App.jsx`.
- Wired auth-session loading in `frontend/src/components/layout/ProtectedRoute.jsx`.
- Updated `frontend/src/components/ui/PageTransition.jsx` for reduced-motion behavior.
- Integrated table skeletons and `aria-busy` into `frontend/src/components/ui/DataTable.jsx`.
- Integrated modal busy-state handling, async confirm behavior, and shared action progress into `frontend/src/components/ui/Modal.jsx`.
- Integrated action progress into login, change-password, center settings, and backup/restore drill operations.
- Wrapped Dashboard, Reports, and Advanced Reports chart containers and added Recharts `initialDimension`/`minWidth`/`minHeight` safeguards.
- Fixed reviewer findings for modal-close races, async confirm close-before-failure, center-settings reload throws, DataTable keyboard row actions, and `aria-sort` placement.

Validation:

- `npm --prefix frontend run lint -- --max-warnings=0`
- `npx tsc --noEmit`
- `npm run build`
- `npm run test:unit` 61/61
- `git diff --check`
- Local browser baseline default: `docs/artifacts/ux-baseline/local-phase3-safe/2026-06-09T13-58-12-656Z/`
- Local browser baseline reduced-motion: `docs/artifacts/ux-baseline/local-phase3-safe-reduced/2026-06-09T13-58-41-386Z/`
- Local browser baseline final default: `docs/artifacts/ux-baseline/local-phase3-final/2026-06-09T15-01-36-967Z/` (16/16 scenarios, zero console/API/page/overflow/blank findings)
- Local browser baseline final reduced-motion: `docs/artifacts/ux-baseline/local-phase3-final-reduced/2026-06-09T15-02-30-688Z/` (32/32 scenarios, zero console/API/page/overflow/blank findings)
- Receipt: `receipts/2026-06-09-eduflow-motion-phase3-loading-chart-safe.md`
