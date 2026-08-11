# Student Progress Review Mock Data - Verification Receipt

**Date:** 2026-08-11

## Scope

- Diagnose why production Student Progress rows and charts appeared blank.
- Provide reviewable, realistic Cambridge-track mock data without changing production truth.
- Verify the complete fixture lifecycle and authenticated UI rendering.

## Root Cause

The screenshots were from production records. Those learners do not have dated academic evidence, and the guarded review fixture had intentionally never been seeded into production. The UI correctly preserves missing values as blank instead of fabricating zero scores.

## Implemented Review Fixture

- Namespace: `demo-sp-review-v1`.
- Five profiles: Starters, Movers, Flyers, KET and PET.
- Three completed months per profile.
- Four dated evidence updates per month and seven skill groups.
- Separate `exam_set_level` and `difficulty_level` values.
- Varied improving, stable, declining, breakthrough and inconsistent trajectories.
- Zero-fee demo classes; no receipt, payment or monthly-fee records.

## Safety

- Known production Neon endpoint is denied.
- Preview execution requires exact endpoint/database identity and a database explicitly named review/preview/demo/test.
- Local execution additionally requires loopback PostgreSQL.
- Explicit confirmation token remains mandatory.

## Runtime Evidence

- Isolated PostgreSQL database: `edu_manager_review` on loopback.
- All repository migrations applied successfully.
- Lifecycle passed: `apply -> verify -> cleanup -> apply -> verify`.
- Final counts: 5 parents, 5 students, 5 classes, 5 enrollments, 15 progress months, 105 skill rows, 420 daily entries, 60 sessions and 60 attendance rows.
- Authenticated browser rendered five learners, fifteen report rows, populated KPI/chart panels and Nguyễn Minh An's four-entry July timeline.
- Browser console errors: 0.
- Screenshot: `docs/artifacts/student-progress-2026-08-10/review-demo-browser.png`.
- Historical exam-set readback passed: Phạm Tuệ Nhi's May entries are labelled `A1 Movers`; June and July entries are labelled `A2 Key / KET`.

## Quality Gates

- Focused fixture/safety tests: `6/6` pass.
- Root unit suite: `525/525` pass.
- `npx tsc --noEmit`: pass.
- Frontend production build: pass.
- `git diff --check`: pass (line-ending warnings only).
- Independent fixture review: no P0 remained. Its loopback parser finding was fixed so both `localhost` and `127.0.0.1` retain their complete host identity; regression and real fixture verification passed with `127.0.0.1`.

## Boundary

Production was not seeded or mutated. Existing blank production rows mean the corresponding learners still need real daily academic evidence.

## Release

- Source commit: `80b815d` pushed to `origin/main`.
- Vercel production deployment: `dpl_BxYkLec32DKLjUo7eSR9soLifgHw`, status `Ready`.
- Canonical alias: `https://edu-manager-gules.vercel.app`.
- Smoke: `/` = 200, `/student-progress` = 200, protected report API without token = 401.
- Release includes fixture tooling and evidence only; no demo rows were inserted into the production database.
