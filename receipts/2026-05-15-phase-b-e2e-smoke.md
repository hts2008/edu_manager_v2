# Phase B E2E Smoke Receipt

**Date**: 2026-05-15
**Project**: EDU_MANAGER_V2
**Scope**: B5 Playwright smoke baseline.

## Implemented
- Added `frontend/playwright.config.js`.
- Added `frontend/e2e/phase-b-smoke.spec.js`.
- Added `frontend` script `test:e2e`.
- Added `.gitignore` entries for Playwright artifacts.

## Coverage
- Auth UI login reaches protected dashboard.
- Student onboarding surface opens and cancels without mutating data.
- Attendance, attendance periods, and fee collection workspaces load.
- Payment creation surface opens and cancels without mutating data.
- Receipts and templates workspaces load.
- Reports page loads and the financial API contract returns `receipts`, `payments`, `paymentsByCategory`, and `summary`.

## Safety
- Default target is local `http://127.0.0.1:3000`.
- Production target is opt-in via `E2E_BASE_URL`.
- Mutating flow branches remain disabled unless `E2E_ALLOW_MUTATION=1`.

## Verification
- `cd frontend && npm run test:e2e -- --reporter=list` passed: 6/6.
- `cd frontend && npm run lint -- --max-warnings=0` passed.
- `npm run test:unit` passed: 8/8.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- Root and frontend `npm audit --audit-level=high` passed: 0 vulnerabilities.

## Notes
- Production Playwright run was not used for the full suite because repeated production logins hit the login rate-limit during test development. Production was already smoke-tested separately with Chrome and API probes after deploy.
