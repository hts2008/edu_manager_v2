# Production Deploy + Env/Storage Closeout - 2026-05-23

## Scope
- Deploy the locally verified 2026-05-18/2026-05-19 hardening and EduFlow UI updates to the active Vercel production project.
- Restore missing production runtime env/storage.
- Verify that auth, reports, receipts/PDF, template image upload, cron guard, and production UX smoke pass.

## Root Cause
- The active Vercel project `hts2008s-projects/edu-manager` initially had no Production env vars, so production login failed with missing `DATABASE_URL`.
- The old `https://edu-manager-delta.vercel.app` URL was stale/not the active project alias.
- Initial `.vercelignore` patterns `receipts/` and `reports/` were not root-anchored, so Vercel excluded `server/api/receipts` and `server/api/reports` from the function bundle.
- Template image upload failed with `STORAGE_NOT_CONFIGURED` because `BLOB_READ_WRITE_TOKEN` was not configured.

## Changes / Ops
- Added Production env vars in Vercel without printing values:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `BLOB_READ_WRITE_TOKEN`
  - `CRON_SECRET`
- Created and linked public Vercel Blob store `edu-manager-live-blob` (`store_UOmPDaMiPE4RpzcX`) to Production.
- Deleted three unlinked empty Blob stores created during CLI discovery.
- Added `.vercelignore` and corrected patterns to root-only operational ignores.
- Ran `npm --prefix frontend audit fix` to update the vulnerable transitive `ws` dependency; frontend audit now reports 0 vulnerabilities.

## Production Deployment
- Final deployment: `dpl_2HXPKo2UcdrRUBrAGBzrYyeHvHe9`.
- Production URL: `https://edu-manager-gules.vercel.app`.
- Inspect output: status `Ready`, function `api/router`, aliases include:
  - `https://edu-manager-gules.vercel.app`
  - `https://edu-manager-hts2008s-projects.vercel.app`
  - `https://edu-manager-hts2008-hts2008s-projects.vercel.app`

## Verification
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 28/28.
- `npm --prefix frontend run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.
- `npm audit --audit-level=high` passed.
- `npm --prefix frontend audit` found 0 vulnerabilities.
- Final Vercel build/install found 0 vulnerabilities in root and frontend packages.
- Production root returned 200 with current assets.
- Production login returned 200.
- `/api/auth/me` without token returned 401.
- `/api/cron/monthly-fees` without token returned 403.
- `/api/templates/upload-image` returned 201 with a Blob URL.
- Production Playwright:
  - `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js --reporter=list`
  - Target: `E2E_BASE_URL=https://edu-manager-gules.vercel.app`
  - Result: 6/6 passed.

## Notes
- Two 1x1 smoke images remain in `edu-manager-live-blob` as runtime upload evidence; total store size observed after smoke was 136B.
- Live SMS/Zalo provider sending remains intentionally disabled until provider webhook, opt-in policy, and message templates are approved.
- Default admin credentials and JWT secret should be rotated before real production operation.
