# Spreadsheet Workflow Contract

## Layout And Modes

```text
[fixed/collapsible rail]  Tiến bộ học viên
                         [Cập nhật | Tổng quan | Báo cáo]
                         [Lớp] [Tháng] [Theo ngày | Theo tháng] [Ngày] [Tìm học viên]
                         Học viên | Nghe | Nói | Đọc | Viết | Ghi chú | Điểm tháng | Lưu
                         Minh An  |  80  |  75 |  82 |  78  | ...     |  server    | icon
                         Gia Bình |  70  |  74 |  76 |  72  | ...     |  server    | icon
```

Always-visible cells is the selected requirement. Class/month selection is required before writes; initial class uses only authorized choices, never arbitrary first tenant class. One row per student-class-selected period, not one row per historical month. Editing defaults to daily mode with a visible civil date within the chosen month. Monthly mode explicitly edits manual monthly skill evidence; changing mode never converts daily fallback to manual scores.

Four academic skills visible initially; BTVN/practice/mock-test columns available through a persisted user column selector built from stable supported rubric keys. Exam set and difficulty are distinct context controls; grader derived only from the assigned active teacher. Missing/ambiguous grader blocks saves and states an actionable reason. Additional metadata/evidence types live under an in-row disclosure, never a right panel.

## Field Semantics

- Display scores in their actual scale. 0 is valid; blank is no assessment, not zero. Keep numeric input string while editing; validate range/precision against canonical contract before submit.
- Daily cells edit only their stable owned assessment entry. If several entries exist for same skill/date, show a read-only aggregate plus count and same-row evidence expansion; never treat an average as an editable persisted original or overwrite a whole collection.
- Monthly cells show manual input, with daily-derived value clearly distinguished as read-only reference. Explicit clear requires a clear operation, not accidental omission. Absent fields preserve all existing input.
- Overall progress, attendance, coverage, trend, readiness and finalized snapshot values are read-only. Source-aware labels: điểm giáo viên / điểm đánh giá hằng ngày / chỉ số hoạt động / chưa có dữ liệu / dữ liệu cũ chưa rõ nguồn.
- Track/calibration changes may make delta unavailable; show reason without inventing0. Finalized rows lock input; reopen remains existing authorized admin action with reason, not an inline edit permission shortcut.

## Save And Feedback

Default explicit save per row, icon+tooltip/accessibility label; no per-keystroke or implicit blur commit. Enter moves through cells, Tab/Shift+Tab follows logical focus, Escape cancels current edit; Ctrl/Cmd+Enter saves current row. Editing and navigation keyboard modes follow the selected accessible implementation. Shortcuts are documented in help, not painted into the working table.

Row state: loading -> clean -> dirty -> saving -> saved; alternate invalid / offline / conflict / forbidden / finalized. Dirty and saved must have text/icon, not shadow/color alone. Disable duplicate submission for that row; other rows remain editable. Save success replaces aggregate/source/coverage from authoritative response and triggers scoped report/timeline invalidation, preserving focus and scroll. Do not reorder row while typing; re-sort after explicit action or leaving edit context.

Immediate update means server-confirmed response appears without page reload. Draft inputs are local; no false success toast before commit. Failed saves retain draft and show inline error. Timeout has unknown outcome: read version/operation result before retry. Context changes with dirty rows offer stay/discard; explicit row save can be selected first. Refresh/network retries cannot silently clear drafts. No persistent student draft in localStorage in initial release.

## Proposed API Prerequisites (Not Implemented)

Existing `PUT /api/student-progress/daily` replaces all selected-date entries. DO NOT call it with a single-cell subset. Serializable retry alone does not detect a stale draft submitted later.

Propose `PATCH /api/student-progress/daily` with student_id/class_id/entry_date, expected_evidence_version, operation_id and explicit entry operations (create/update/clear by stable IDs). Endpoint name/method must be validated against router conventions in phase02. Reject foreign entries, duplicate operations, unrelated skills and missing precondition; bounded payload. Preserve all untouched notes/shields/practice and other dates.

Add dedicated integer evidenceVersion to StudentProgressMonth rather than repurposing finalized revisionNumber. All daily PUT/PATCH/DELETE and monthly mutations/finalize/reopen must participate in the same version protocol. Under Serializable transaction: authorize tenant/class/grader, check frozen state/settings, compare-and-swap version, apply explicit mutations, canonical recompute and activity; response returns fresh version and canonical row summary. Version0 for first creation must be concurrency-tested. Proposed conflicts return409 with safe current version/refetch guidance, never last-write-wins.

Operation idempotency must distinguish same ID+same hash from ID+different hash and replay the persisted response; design/retention follows existing receipt-batch patterns, scoped tenant+actor+entity. Separate this from configVersion, which identifies rubric/content configuration, not evidence.

Save also carries the accepted academic configuration basis. If applicable track/scale/rubric changes while the row is dirty, reject or require explicit review/refetch before submission; never silently reinterpret typed scores under a different rubric. Unrelated presentation-copy updates must not manufacture an academic conflict: compare academic basis, not merely any tenant configVersion bump. Server computes the current effective academic basis inside the same write transaction.

Monthly writes require equivalent evidence precondition and explicit patch semantics. Finalization checks the same evidence version; finalized records still immutable. No migration or schema change is authorized in this planning deliverable.

## Teacher Access Gap

Current UserRole is admin/receptionist; Teacher is grader data, not an authenticated role. Initial rollout targets existing actors with progress.view/grade. Before teacher self-service, approve persisted user-to-teacher binding and server-side class scope, then test reassignment/revocation/foreign class denial on every read/write. Hiding menu items is not authorization. Do not add teacher role or broad grade permission as a cosmetic UX fix.

## Responsive Behavior

Desktop: full roster; sticky first learner column and header, horizontal scroll inside bounded table only for extra columns. Tablet: collapsed rail and configurable fewer columns. Mobile: same learner rows become stacked inline inputs (not a side dialog); skill group selector preserves complete draft state. Vertical page scroll belongs to main, no competing vertical table scroll in default flow. Touch targets>=44px; support 200% zoom, keyboard and Vietnamese diacritics.

Paste/bulk save/copy previous-month scores are deferred. Reusing past scores without new evidence would violate honesty; later bulk submission must have per-row outcomes and preserve unsuccessful drafts.
