# EDU Manager: Teacher Workspace And Soft Clay

Status: researched proposal / implementation pending. User selected always-visible score cells, spreadsheet-style input on 2026-10-05. This does not approve new scoring rules, teacher identity privileges, dependencies or deployment.

## Direction

- `/student-progress` becomes a full-width class roster workspace, not a reporting dashboard with a permanent parent-print inspector.
- Default task: choose class + month + daily date, enter scores directly in rows, save the row, see server-confirmed results immediately. No right-hand editor or print panel.
- Separate tabs: **Cập nhật**, **Tổng quan**, **Báo cáo**. Detailed learner timeline remains accessible via existing learner dashboard route.
- Fixed collapsible navigation; soft clay controls and restrained semantic colors. Dense, opaque tables remain flat and readable.
- Tenant-scoped content/theme console lets authorized owners edit wording and bounded visual tokens without editing code. Defaults, domain keys and permissions remain code-owned.

## Documents

1. [Research, PRD traceability and options](research-and-decisions.md).
2. [Spreadsheet interaction and persistence contract](spreadsheet-workflow.md).
3. [Shell, theme, effects and animation](design-system.md).
4. [Editable content/theme console](content-console.md).
5. [Acceptance and evidence matrix](verification-matrix.md).
6. [Implementation plan](../../../plans/2026-10-05-teacher-workspace-clay/plan.md).

## Evidence Boundaries

Read current report, daily API/editor, shell/sidebar, settings registry, June progress/UX plans, Admin Console PRD and TP-1 contract. Attached user screenshot supplied visual evidence; no claim of exhaustive app review or usability testing.

Stitch inventory succeeded and existing EDU projects were found. Its exposed generation schema only accepts GEMINI_3_8_FLASH/GEMINI_3_5_FLASH_LITE, not required GEMINI_3_1_PRO. No model substitution or generation claim. Figma authentication succeeded; no current editable file URL/key was found in the bounded local handoff search, and no new frames were written. Design approval requires actual Stitch/Figma frames later; Markdown wireframes are not visual parity evidence.

UX orchestrator SKILL.md requested by workspace is absent; invoked available ui-ux-pro-max, brainstorm and ck-plan guidance directly. ck CLI absent: manual project-local docs scaffolding; no global install. NM/C+ unavailable, markdown-only state. Current tuition/progress production NO-GO remains unchanged.
