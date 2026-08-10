# Student Progress Evidence Semantics + Review Data Closeout

**Date:** 2026-08-10

**Status:** IMPLEMENTED / PRODUCTION LIVE

**Canonical URL:** `https://edu-manager-gules.vercel.app`

**Deployment:** `dpl_CAFAZ1hnHTvbsQNnVVEVCnwCJpQz` (`Ready`, target `production`)

**Commit:** `9ca29c6`

## Delivered Scope

- Added `StudentProgressDailyEntry.examSetLevel` / `exam_set_level` as the source for Cambridge exam-set/curriculum metadata.
- Kept `difficulty_level` for exercise difficulty only (`easy`, `medium`, `hard`).
- Preserved rolling compatibility by accepting cached-client legacy Cambridge values in `difficulty_level` and normalizing them into `exam_set_level`.
- Updated Student Progress API, timeline, finalization and frontend DTOs to expose both semantics separately.
- Updated the per-student daily editor to show separate controls for `Bộ đề / cấp độ` and `Độ khó`.
- Removed the duplicate aggregate quick-entry form from `/student-progress`; aggregate report now directs operators to the per-student dashboard.
- Added guarded review/demo data tooling with namespace, cleanup and non-production DB identity requirements.
- Updated root and frontend lockfiles to close current moderate transitive advisories.

## Acceptance Matrix

| Case | Acceptance | Evidence | Result |
| --- | --- | --- | --- |
| TC-SPSEM-01 | Schema stores `exam_set_level` without destructive migration | Prisma migration + validate/status | PASS |
| TC-SPSEM-02 | Legacy Cambridge `difficulty_level` payloads remain accepted during rolling deploy | `tests/student-progress-daily-api.test.ts` | PASS |
| TC-SPSEM-03 | Difficulty weighting reads normalized exam-set metadata and true task difficulty separately | `tests/progress-difficulty.test.ts` | PASS |
| TC-SPSEM-04 | Aggregate report no longer contains duplicate quick-entry UI | Production chunk scan | PASS |
| TC-SPSEM-05 | Per-student dashboard exposes both `Bộ đề / cấp độ` and `Độ khó` | Production detail chunk scan | PASS |
| TC-SPSEM-06 | Demo data is namespaced, preview-first, reversible and rejects production endpoint | `tests/student-progress-review-demo.test.ts` | PASS |
| TC-SPSEM-07 | No production demo data mutation occurs without preview DB identity | Env presence check | PASS |
| TC-SPSEM-08 | Production alias serves the new deployed assets | Vercel inspect + production root/chunk scan | PASS |

## Verification Gates

| Gate | Result |
| --- | --- |
| Focused Student Progress semantics/demo tests | `27/27` PASS |
| Root unit | `523/523` PASS |
| Frontend unit | `52/52` PASS |
| TypeScript | PASS |
| Frontend lint | PASS |
| Production build | PASS |
| Prisma validate | PASS |
| Prisma migrate status | PASS; production schema up to date |
| Root dependency audit | PASS, `0` vulnerabilities at moderate gate |
| Frontend dependency audit | PASS, `0` vulnerabilities at moderate gate |
| Diff check | PASS |
| Independent code review | `GO`; no P0/P1/P2 findings after compatibility fix |
| Production deploy | Vercel `Ready`; canonical alias attached |

## Production Evidence

- Production root returned HTTP 200 and referenced `index-DOGtm7sb.js`.
- Entry chunk references `StudentProgressReportPage-CgHwZrEx.js` and `StudentProgressDetailPage-DJXyFcu0.js`.
- `StudentProgressReportPage-CgHwZrEx.js` contains `Mở dashboard học viên`.
- `StudentProgressReportPage-CgHwZrEx.js` does not contain old quick-entry markers `ProgressInputPanel`, `progress-input-panel`, `Cập nhật tiến độ tháng`, `Theo ngày điểm danh`, `Lưu nhận xét tháng` or `Chốt bản ghi tháng này`.
- `StudentProgressDetailPage-DJXyFcu0.js` contains both `Bộ đề / cấp độ` and `Độ khó`.
- Protected Student Progress APIs return `401` without a token, preserving auth boundary.

## Demo Review Data

`scripts/student-progress-review-demo.ts` defines three labelled review scenarios for the parent/student progress dashboard:

- `[DEMO] Nguyễn Minh An`: improving profile with monthly targets `[61, 73, 84]`.
- `[DEMO] Trần Gia Bình`: stable profile with monthly targets `[75, 77, 78]`.
- `[DEMO] Lê Khánh Chi`: needs-support profile with monthly targets `[71, 63, 56]`.

The fixture records `exam_set_level: "flyers"` separately from daily task difficulty sequence `easy`, `medium`, `medium`, `hard`.

The script supports `apply`, `verify` and `cleanup`, uses namespace `demo-sp-review-v1`, runs in a serializable transaction and requires exact non-production preview DB identity. It rejects the known production Neon endpoint independently.

For review without DB mutation, the static fixture lives at `docs/artifacts/student-progress-2026-08-10/review-demo-data.json`.

## Release Safety

- No secret, credential, token or database URL is included in this receipt.
- Demo fixture was not applied in this shell because `STUDENT_PROGRESS_DEMO_CONFIRM`, `STUDENT_PROGRESS_DEMO_TARGET`, `STUDENT_PROGRESS_DEMO_ENDPOINT_ID` and `STUDENT_PROGRESS_DEMO_DATABASE_NAME` were absent.
- No production demo data was inserted.
- Attendance and finance modules were not changed in this closeout.
- Rollback is the prior Vercel deployment; the schema change is additive and the API remains rolling-compatible with cached clients.

## Known Boundary

Authenticated production browser click-through was not fabricated because the production credential/session is operator-managed and unavailable in this shell. The deployed UI was verified by exact production asset readback, unauthenticated auth-boundary checks, local/full test gates and independent code review.

## Artifact

Compact artifact notes: `docs/artifacts/student-progress-2026-08-10/README.md`.
