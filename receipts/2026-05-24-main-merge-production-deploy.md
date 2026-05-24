# Main Merge + Production Deploy - 2026-05-24

## Scope
- Make `main` the source-of-truth for the production hardening branch.
- Deploy the current `main` to Vercel production.
- Smoke the canonical production URL after deploy.

## Git
- `codex/edu-production-readiness` was clean and tracking `origin/codex/edu-production-readiness`.
- `origin/main` was an ancestor of the branch.
- `main` fast-forwarded from `54902e5` to `e4bab40`.
- `origin/main` was pushed successfully.

## Deployment
- Vercel Git deployment did not visibly create a new deployment after pushing `main`.
- Ran `npx vercel deploy --prod --yes` from `main`.
- Deployment ID: `dpl_8vQ9fWhfVJh1AAfKjzUr8mpNHH4o`.
- Deployment URL: `https://edu-manager-anfllneew-hts2008s-projects.vercel.app`.
- Canonical alias: `https://edu-manager-gules.vercel.app`.
- Status: Ready.

## Local Verification Before Production Deploy
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 28/28.
- `npm --prefix frontend run lint` passed.
- `npm run build` passed; only existing Vite dynamic-import/chunk-size warnings and Prisma major-version notice were printed.
- `npm audit --audit-level=high` passed.
- `npm --prefix frontend audit --audit-level=high` passed.

## Production Smoke
- `/` returned 200.
- `/api/auth/me` without token returned 401.
- `/api/cron/monthly-fees` without token returned 403.
- Login with the approved smoke account returned 200.
- `/api/reports/dashboard` returned all operations-console fields: `stats`, `recent_transactions`, `unpaid_students`, `today_attendance`, `attention_items`, and `quick_metrics`.
- `/api/reports/student-fees?month=2026-05` returned 200.
- Receipt PDF returned 200, `application/pdf`, `%PDF`, 17070 bytes.
- `/api/templates/upload-image` returned 201 with a Blob URL.
- Production Playwright `ux-redesign-smoke.spec.js` passed 6/6 against `https://edu-manager-gules.vercel.app`.

## Notes
- One additional 1x1 smoke image was uploaded to Vercel Blob as runtime storage evidence.
- Live SMS/Zalo sending remains disabled until provider, opt-in policy, templates, and rate controls are approved.
- Default admin credentials and JWT secret still need rotation before real operation.
- Vercel build warns that `"engines": { "node": ">=20" }` can auto-upgrade on future Node majors; pin a Node major separately if runtime drift needs stricter control.
