# Phase C C2 - Student CSV Import Evidence

**Date:** 2026-05-16  
**Scope:** Student + Parent CSV import with preview, validation, duplicate detection, and rollback-protected commit.  
**Production boundary:** Production was preview-only; no production import commit or data mutation was run.

## Implementation

- Added shared CSV parser/preview logic: `lib/import-students.ts`.
- Added production API route: `POST /api/import/students`.
- Added Express reference route: `POST /api/import/students`.
- Added frontend service and admin UI route `/imports`.
- Added Playwright preview coverage and unit tests for parser/preview behavior.
- Decision: native `.xlsx` parsing remains deferred; CSV avoids reintroducing the previously removed vulnerable `xlsx` dependency.

## Verification

- Red test first failed with missing `lib/import-students.js`, then implementation made unit tests pass.
- `npm run test:unit` passed: 16/16.
- `npx tsc --noEmit` passed.
- `cd frontend && npm run lint -- --max-warnings=0` passed.
- `npm run build` passed with existing Vite chunk warnings only.
- `npm audit --audit-level=high` passed at root and frontend: 0 vulnerabilities.
- `cd frontend && npm run test:e2e -- --reporter=list` passed: 15/15.
- Local mutation smoke passed: commit created 1 temporary student + 1 parent, then cleanup verified `cleanup_remaining=0`.

## Production Smoke

- Commit deployed: `aed68f2 feat(phase-c): add student csv import`.
- Route probe changed from 404 to 401 after Vercel deploy, proving the new route was live behind auth.
- Authenticated production preview returned:
  - `status=200`
  - `total_rows=2`
  - `valid_rows=1`
  - `invalid_rows=1`
  - invalid row error `REQUIRED`
- Google Chrome/Playwright production smoke:
  - `E2E_BASE_URL=https://edu-manager-delta.vercel.app`
  - `--grep "student CSV import"`
  - result: 1/1 passed.

## Result

C2 is `IMPLEMENTED` for CSV import. Native `.xlsx` upload should be planned separately with dependency/security approval. Production commit import remains intentionally unrun until the operator approves a real data import.
