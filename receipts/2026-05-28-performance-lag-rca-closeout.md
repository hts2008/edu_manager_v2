# 2026-05-28 - Performance Lag RCA Closeout

## Scope
- Continue the active production-live goal after the user reported remaining lag.
- Keep the work read-only for production data except normal login smoke.
- Use the existing `ck:team` delegation results, close inactive subagents, patch the next unchecked performance risks, redeploy, and verify the final production build in browser.

## RCA
1. Large-page motion and blur were still expensive.
   - Full-page route transitions used page remount animation.
   - Sticky header/sidebar and Attendance surfaces used large backdrop blur areas.
2. Some pages showed false zero states during initial load.
   - Students and Fee Workbench rendered `0` before the first real response.
3. DataTable did too much client work by default.
   - Default display was effectively all rows.
   - Search used broad object scanning, including nested objects.
4. High-fanout report/workbench APIs still overfetched.
   - Report handlers selected more columns/relations than the UI needed.
5. Attendance still had stale-request risk.
   - Changing class/month could leave older async responses writing calendar, period, or week attendance state.
   - 3-month attendance loads were sequential instead of parallel.
6. Production still has a residual cold-start/Neon latency floor.
   - Local timings are consistently much lower than production.
   - The final production smoke passes all route/API gates, but cold starts can still produce multi-second route samples.

## Implementation
- Reduced route transition cost to opacity-only and removed the `AnimatePresence` remount wrapper from the main outlet.
- Replaced full-screen protected-route loading with a lightweight skeleton.
- Reworked `DataTable` to default to 100 rows, use `useDeferredValue`, and support `searchKeys`/`getSearchText`.
- Updated Students and Fee Workbench to keep honest loading states and avoid fake zero metrics.
- Added request guard to Fee Workbench data loading.
- Added request guards to Attendance class/week loading, reset state on class clear, and parallelized 3-month attendance/period fetches.
- Removed large `backdrop-blur-2xl` surfaces from Header, Sidebar, and Attendance cards.
- Narrowed Prisma selects for financial and student-fees reports.
- Added `scripts/perf-lab.mjs` and `npm run perf:lab` as a read-only browser/API evidence harness.

## Team Mode
- Backend worker optimized report select payloads.
- Perf-lab worker added the read-only performance harness.
- Frontend reviewer identified remaining stale request, false zero, DataTable, motion, and blur risks.
- All three subagents were closed after their outputs were integrated/reviewed.

## Verification
| Gate | Result |
| --- | --- |
| `node --check scripts/perf-lab.mjs` | Pass |
| `npm run perf:lab -- --help` | Pass |
| `npx tsc --noEmit` | Pass |
| `npm --prefix frontend run lint -- --max-warnings=0` | Pass |
| `npm run test:unit` | Pass, 39/39 |
| `npm run build` | Pass |
| `git diff --check` | Pass, LF/CRLF warnings only |
| Local `npm run perf:lab -- --base http://127.0.0.1:3000 --route-severe-ms 15000 --api-severe-ms 10000` | Pass, `receipts/perf/perf-lab-2026-05-28T16-04-40-168Z.md` |
| Local Playwright `ux-redesign-smoke.spec.js phase-b-smoke.spec.js` | Pass, 28/28 |
| Vercel production deploy | Ready, `dpl_8tNtmmYtCJtY8U4gv8swgUWhpKEj` |
| Production `npm run perf:lab -- --base https://edu-manager-gules.vercel.app --route-severe-ms 15000 --api-severe-ms 10000` | Pass, `receipts/perf/perf-lab-2026-05-28T16-08-15-968Z.md` |
| Production Playwright `ux-redesign-smoke.spec.js phase-b-smoke.spec.js` | Pass, 28/28 |

## Production Deployment
- Deployment ID: `dpl_8tNtmmYtCJtY8U4gv8swgUWhpKEj`
- Production URL: `https://edu-manager-gules.vercel.app`
- Inspect URL: `https://vercel.com/hts2008s-projects/edu-manager/8tNtmmYtCJtY8U4gv8swgUWhpKEj`

## Safety
- No Prisma migration, seed, or destructive production mutation was run.
- Perf-lab allows only `POST /api/auth/login` as the login mutation and flags any other write request as a read-only violation.
- Production smoke completed with read-only guard enabled and no read-only violations.

## Residual Risk
- Production serverless cold starts and Neon network latency still show multi-second samples on first-touch routes. This is now measured instead of guessed. If the user wants a deeper infrastructure pass, the next step should evaluate Vercel Fluid Compute/warmers, report materialization, Neon pooling/region alignment, and route-specific cache headers.

## Status
IMPLEMENTED.
