# Frontend Attendance Reviewer Follow-up - 2026-07-16

## Scope

- Frontend ownership only: attendance page save race, month-plan editor preservation semantics, Tuition V3 utility/source contract, attendance unit/source tests and Tuition V3 UI contract.
- No backend files were edited.

## Changes

- `AttendancePage.jsx`: class/month/week interactions include `saving`; attendance save captures class/week/month-window context and validates it before refreshing class and week data. Month-plan save refresh uses the same context guard.
- `AttendanceMonthPlanEditor.jsx`: regular-only plans use PUT; plans with makeup/extra sessions use PATCH regular-row add/remove semantics. Only requested regular dates that overlap a non-regular session are blocked. No-op PATCH saves do not call the API.
- `tuitionV3.js`: added `buildMonthPlanPatchRequest` with aggregate and row-version guards.
- Accessibility: loading surfaces use `role=status`, `aria-live` and `aria-busy`; error surfaces use `role=alert`.
- Contract: replaced obsolete `feePerSessionByMonth` assertion with current `classSessionsByMonth` and `calculateTuitionCharge` assertions.

## Verification

| Check | Result |
| --- | --- |
| `node --test tests` from `frontend` | PASS, 24/24 |
| Focused ESLint for touched frontend files/tests | PASS, exit 0, no output |
| Static Tuition V3 contract | PASS |
| `git diff --check` for touched app/test files | PASS, exit 0 |
| `npx playwright test e2e/tuition-v3-ui-contract.spec.js` | BLOCKED: browser startup hung without output in normal and CI modes; process tree terminated |

## Residual Risk

- Playwright browser startup needs a separate environment investigation. No E2E pass is claimed from this session.
- Context+ and EDU-scoped Neural Memory/MCPProxy were unavailable in the callable palette; manual inspection and markdown memory were used.
