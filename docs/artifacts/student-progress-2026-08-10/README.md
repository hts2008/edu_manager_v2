# Student Progress Evidence Semantics - Production Verification

**Date:** 2026-08-10

**Production URL:** `https://edu-manager-gules.vercel.app`

**Deployment:** `dpl_CAFAZ1hnHTvbsQNnVVEVCnwCJpQz`

**Commit:** `9ca29c6`

## What Was Verified

- Production alias serves the new Vite entry chunk `index-DOGtm7sb.js`.
- Entry chunk lazy-loads:
  - `StudentProgressReportPage-CgHwZrEx.js`
  - `StudentProgressDetailPage-DJXyFcu0.js`
- Report chunk contains `Mở dashboard học viên`.
- Report chunk does not contain old aggregate quick-entry markers:
  - `ProgressInputPanel`
  - `progress-input-panel`
  - `Cập nhật tiến độ tháng`
  - `Theo ngày điểm danh`
  - `Lưu nhận xét tháng`
  - `Chốt bản ghi tháng này`
- Detail chunk contains both `Bộ đề / cấp độ` and `Độ khó`.
- Protected Student Progress APIs return `401` without authentication.

## Verification Commands

```powershell
git status --short
git log -8 --oneline --decorate
npx tsx --test tests\student-progress-daily-api.test.ts tests\progress-difficulty.test.ts tests\student-progress-review-demo.test.ts
npm run test:unit
npm --prefix frontend run test:unit
npm --prefix frontend run lint
npx tsc --noEmit
npm run build
npx prisma validate
npx prisma migrate status
npm audit --omit=dev --audit-level=moderate
npm --prefix frontend audit --audit-level=moderate
npx vercel inspect edu-manager-4lide5zgo-hts2008s-projects.vercel.app --scope hts2008s-projects
```

## Results

- Focused Student Progress semantics/demo tests: `27/27` pass.
- Root unit suite: `523/523` pass.
- Frontend unit suite: `52/52` pass.
- TypeScript, frontend lint, production build, Prisma validate/status, root/frontend audits and diff-check pass.
- Independent read-only reviewer returned `GO`.
- Vercel inspect reported deployment Ready and canonical aliases attached.

## Demo Data Boundary

The review/demo fixture exists at `scripts/student-progress-review-demo.ts` and creates five labelled Cambridge-track scenarios:

- `[DEMO] Nguyễn Minh An`: improving profile.
- `[DEMO] Trần Gia Bình`: stable profile.
- `[DEMO] Lê Khánh Chi`: needs-support profile.
- `[DEMO] Phạm Tuệ Nhi`: KET exam-prep breakthrough profile.
- `[DEMO] Đỗ Anh Khoa`: high-performing PET profile with inconsistent practice.

The five records cover Starters, Movers, Flyers, KET and PET. Each record has three months, four daily evidence dates per month, seven skill groups and an `easy -> medium -> medium -> hard` difficulty progression. Exam set level and difficulty remain separate fields.

For review without database mutation, the same scenario shape is captured in `review-demo-data.json`.

Authenticated browser evidence from the isolated review database is captured in `review-demo-browser.png`. It shows populated report rows, KPIs, charts and the per-student daily timeline; browser console errors were zero.

The fixture is intentionally guarded:

- Namespace: `demo-sp-review-v1`.
- Commands: `apply`, `verify`, `cleanup`.
- Required confirmation: `STUDENT_PROGRESS_DEMO_CONFIRM=demo-sp-review-v1`.
- Required target: `STUDENT_PROGRESS_DEMO_TARGET=preview|local`.
- Preview requires exact endpoint/database identity. Every review database name must contain `review`, `preview`, `demo`, or `test`; local additionally requires a loopback PostgreSQL host.
- Hard rejects the known production Neon endpoint.

The fixture was exercised against isolated local PostgreSQL using `apply -> verify -> cleanup -> apply -> verify`. Final verified counts were 5 parents, 5 students, 5 classes, 5 enrollments, 15 progress months, 105 skill rows, 420 daily entries, 60 sessions and 60 attendance rows. Production data was not mutated.

## Authenticated Smoke Boundary

Production credential/session is operator-managed and not stored in source control. Authenticated browser click-through was therefore not fabricated in this closeout. Static production asset verification and unauthenticated `401` boundary checks were used for this release evidence.
