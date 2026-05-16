# Phase C Bulk Actions Receipt

**Date**: 2026-05-16
**Project**: EDU_MANAGER_V2
**Scope**: C1 Bulk Actions.

## Implemented
- Added Vercel `POST /api/bulk-actions`.
- Added matching Express reference `POST /api/bulk-actions`.
- Added `bulkActionsService`.
- Added selectable rows to `DataTable`.
- Added reusable `BulkActionBar`.
- Added bulk controls for Students, Parents, Receipts, and Payments.
- Extended Playwright smoke suite from 12 to 13 tests with non-mutating UI/API validation coverage.

## Safety
- Bulk actions are admin-only.
- Students support `archive` by setting `status=inactive`.
- Student hard delete is blocked when class, attendance, monthly fee, or receipt records exist.
- Parent hard delete is blocked when linked students exist.
- Receipt delete restores linked monthly fees to `confirmed` and clears receipt linkage.
- Parents, receipts, and payments do not support archive because the current schema has no `status` or `deletedAt` field for those entities.

## Verification
- `npx tsc --noEmit` passed.
- `cd frontend && npm run lint -- --max-warnings=0` passed.
- `npm run test:unit` passed: 13/13.
- `npm run build` passed with existing Vite chunk warnings.
- Root `npm audit --audit-level=high` passed: 0 vulnerabilities.
- Frontend `npm audit --audit-level=high` passed: 0 vulnerabilities.
- Local mutation smoke passed: created a temporary parent and bulk-deleted it through `POST http://127.0.0.1:5000/api/bulk-actions`, `succeeded=1`, `failed=0`.
- `cd frontend && npm run test:e2e -- --reporter=list` passed: 13/13.
- Production API validation smoke after commit `53e1b42` passed: `POST /api/bulk-actions` with empty ids returned `400 VALIDATION_ERROR`.
- Production non-mutating action smoke passed: missing ID request returned `success=true`, `requested=1`, `succeeded=0`, `failed=1`, `NOT_FOUND`.
- Production Google Chrome/Playwright smoke passed: `E2E_BASE_URL=https://edu-manager-delta.vercel.app npm run test:e2e -- --grep "bulk action" --reporter=list` returned 1/1 passed.

## Notes
- Destructive production bulk actions were not run. They still require explicit approval.
- No schema migration was required.
