# Error Catalog

## ERR-001: Wrong Node Runtime / PowerShell Policy

**Symptom**: `npm.ps1` is blocked or tests run on the wrong Node version.
**Fix**: Prefix PATH with the bundled Codex Node runtime and use `cmd /c`.
**Status**: Active environment workaround.

## ERR-002: Production API Drift

**Symptom**: UI page renders but API returns 404/500 or a mismatched shape.
**Fix**: Audit page -> service -> server handler -> Prisma model -> tests before
marking a workflow real.
**Status**: Watch item for production readiness plan.

## ERR-003: Dashboard Contract Drift

**Symptom**: Dashboard UI reads `unpaid_students`, but dashboard API may not
return it.
**Fix**: Preserve existing stats/recent_transactions and add optional dashboard
attention fields from real Prisma data.
**Status**: Active fix target.

## ERR-004: Sandbox Build/Audit Restriction

**Symptom**: Vite/esbuild or npm audit cannot access paths or registry/cache
under sandboxed execution.
**Fix**: Record baseline blocker and rerun with approved escalation only when
required for final verification.
**Status**: Active in Codex workspace-write session.

## ERR-005: Monthly Tuition Drift

**Symptom**: Paid monthly fees or receipts can show `days_count=0` with a
positive amount, or a `sessions_per_week` class can multiply monthly tuition by
attendance count.
**Fix**: Use `lib/tuition.ts` for all attendance/monthly-fee/receipt
calculation paths. For `sessions_per_week`, divide monthly tuition by expected
sessions in the actual month; for `schedule_days`, count actual matching
weekdays. Do not silently rewrite paid anomalous receipts; surface them in the
student-fees report for explicit correction policy.
**Status**: Fixed locally on 2026-05-19; production deploy/smoke pending.

## ERR-006: Fabric Upper Canvas Masks Rendered Objects

**Symptom**: Template Designer upload/add-field/add-component actions show
success, object count increases, and selection state changes, but the visible
canvas stays blank/white.
**Cause**: Fabric creates an `upper-canvas` interaction layer above the lower
render canvas and copies the source canvas CSS classes. If the source canvas has
an opaque background class such as `bg-white`, the generated upper layer covers
all rendered lower-canvas objects.
**Fix**: Keep the source Fabric canvas free of opaque background classes, verify
the generated `upper-canvas` background is transparent, call `setCoords()` and
`requestRenderAll()` after object insertion, and assert visible pixel/hash
changes in E2E tests.
**Status**: Fixed and production-smoked on 2026-06-05 with deployment
`dpl_8KRG5ePFEqeKNLZxZZdb9cMjdNg6`.
