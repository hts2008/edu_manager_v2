# Historical / Future Attendance Admin Correction Closeout

**Date:** 2026-07-15  
**Status:** IMPLEMENTED / PRODUCTION LIVE  
**Production:** https://edu-manager-gules.vercel.app  
**Commits:** `7c3dead`, `e29f081`  
**Vercel deployment:** `dpl_BRX8FseRns6MKNkdydVFsah2g4VV`

## Scope

- Allow admins to select any visible week in past, current or future months.
- Allow edits only while the attendance period is open.
- Preserve authoritative half-open enrollment periods and protected finance.
- Make enrollment correction auditable and derive its effective date from real regular class sessions only.

## Root Cause

The production calendar was not restricted to the current week. The apparent restriction came from domain guards: cells before enrollment or inside a non-open period were intentionally disabled. The remaining unsafe edge was the enrollment correction resolver for flexible/session-count classes: broad calendar schedule flags could cause a Monday fallback even when the first real regular session occurred later in the week.

## Implementation

- `resolveEnrollmentCorrection` receives the selected week's authoritative session ledger.
- It accepts only `regular` sessions inside the selected week and ignores `cancelled` or `holiday` sessions.
- It uses the earliest qualifying session as the correction effective date.
- It returns no correction for empty, makeup-only or cancelled-only ledgers; there is no calendar fallback.
- The correction modal uses shared modal/progress primitives, traps focus, supports Escape, locks background scroll and protects unsaved changes.
- Partial/no-op correction responses are treated as errors and leave the modal open.

## Verification Gates

| Gate | Result |
| --- | --- |
| Focused historical UI guard | PASS `13/13` |
| Full unit suite | PASS `385/385` |
| TypeScript | PASS `npx tsc --noEmit` |
| Frontend lint | PASS, zero warnings |
| Production build | PASS |
| Diff hygiene | PASS `git diff --check` |
| Independent review | `GO`, no actionable findings |

## Authenticated Chrome Production Evidence

1. Selected `QA HIST 20260715 A` and historical week `12/7/2026 - 18/7/2026`.
2. Loading state appeared and disabled stale controls until `Đã tải xong - có thể thao tác`.
3. Marked Bùi Hoàng Cường present on 15/7 and saved through the real production API.
4. Reloaded the page, reselected the class/week and read back `✅`, `1/2`, `90.000đ`, proving persistence beyond frontend state.
5. Selected future week `9/8/2026 - 15/8/2026`; six attendance controls and `Luu diem danh` were enabled.
6. Selected locked week `14/6/2026 - 20/6/2026`; UI showed `Tháng 2026-06 không ở trạng thái mở - chỉ xem` and the save control remained disabled.
7. Selected FLYER B6 around enrollment `2026-07-15`; pre-enrollment controls were disabled with title `Chưa ghi danh`, while dates on/after enrollment remained editable.
8. Chrome console error log was empty.

Screenshot: `receipts/artifacts/historical-attendance-admin-production-2026-07-15.png`.

## Safety Boundary

No raw attendance override was introduced. A closed/approved/locked period still requires the existing explicit reopen workflow, and protected fee rows remain immutable. The correction modal's stale-invalid-data branch was not force-created in production; it is covered by focused behavior tests because current production data contains no invalid attendance/enrollment pair that can be opened safely without fabricating an operational defect.

## Tool Degradation

Context+ and EDU-scoped Neural Memory/MCPProxy were not exposed in the callable tool palette. Manual blast-radius inspection, independent reviewer output, workspace memory and runtime evidence were used without reducing quality gates.
