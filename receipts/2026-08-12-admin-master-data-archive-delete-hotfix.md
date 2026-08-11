# Admin Master-Data Archive/Delete Hotfix Receipt

Date: 2026-08-12

## Scope

- Restored admin archive/delete behavior for Students, Parents, Classes and Teachers.
- Standardized API admin guards and frontend failure propagation.
- Preserved linked operational history through archive/soft-delete behavior.
- Fixed the runtime mismatch between numeric Prisma `StudentClass.id` values and legacy string-only helper logic.

## Source And Release

- Application commit: `a3cbf84 fix(admin): restore master-data deletion`
- Branch: `main`
- Vercel deployment: `dpl_26jsj5wwt1s56P59AmYJYpZPA73G`
- Canonical URL: `https://edu-manager-gules.vercel.app`
- Deployment state: Ready / Production

## Verification

- Focused regressions: `38/38`.
- Root unit tests: `528/528`.
- Frontend unit tests: `58/58`.
- TypeScript: pass.
- Frontend lint: pass.
- Production build: pass.
- Review PostgreSQL runtime lifecycle: anonymous 401, receptionist 403, admin create/archive for all four entity types, and persistence postconditions pass.
- Review browser smoke: create temporary student, open delete confirmation, confirm archive, API readback absent, zero console errors.
- Production non-mutating probes: canonical root and `/student-progress` return 200; unauthenticated DELETE for all four endpoints returns 401.
- Production authenticated Chrome: Student Progress UI renders with real production data and zero console errors; all four admin lists expose `Xoa`; confirmation modal opens and is cancelled before mutation.

## Safety Boundary

- No review fixture or mock academic evidence was inserted into production.
- No real production student, parent, class or teacher was deleted during smoke testing.
- The user-facing delete action archives/deactivates records where linked history must be retained; irreversible purge remains a separate governed operation.

## Evidence

- `docs/artifacts/admin-delete-2026-08-12/ui-delete-student-pass.png`
- `docs/artifacts/admin-delete-2026-08-12/README.md`
