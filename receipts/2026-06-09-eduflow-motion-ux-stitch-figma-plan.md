# EduFlow Motion UX/UI Stitch-Figma Plan Receipt

## Scope

Create a project-local implementation plan for the next platform-wide UX/UI track. No product code, database, production data, Stitch screen generation, Figma write, deployment or production mutation was performed.

## Inputs Reviewed

- `KANBAN.md`
- `memory/memory-bank/activeContext.md`
- `memory/memory-bank/progress.md`
- `memory/memory-bank/decisionLog.md`
- `memory/sessions/current-session.md`
- `DESIGN_GUIDELINE.md`
- Frontend routes, layout, shared UI components, loading transitions and E2E inventory
- Existing Stitch project `projects/16803115577660289376`
- Existing Figma page `3:2` and frames `3:3`, `3:36`, `3:142`

## Plan Artifacts

- `plans/2026-06-09-eduflow-motion-ux-stitch-figma/plan.md`
- Phase files `phase-00` through `phase-08`

## Decisions

- Mandatory pipeline: Stitch MCP -> Figma MCP -> React implementation -> Chrome/Playwright verification.
- Every supported Stitch generation call must use `modelId = "GEMINI_3_1_PRO"`.
- Figma is the persistent source of truth; implementation requires the exact frame node and `get_design_context`.
- Loading feedback is a system, not a single spinner: route, initial data, refresh, table, chart, action, PDF/print, upload/save and long-operation states are planned separately.
- Motion must use meaningful transform/opacity transitions, preserve reduced-motion behavior and avoid broad blur/glass effects that could reintroduce lag.

## Team Evidence

- One read-only UX/codebase scout completed and its route/component recommendations were integrated.
- Two additional scout runtimes were already inactive when queried; `wait_agent` returned `not_found`.
- No active subagent remained at closeout.

## Verification

- `git diff --check`: passed; only existing LF/CRLF conversion warnings were reported.
- Plan file includes Stitch prompt contract, variant scoring, Figma structure, motion/loading taxonomy, agent ownership, measurable autoresearch metrics, browser matrix, quality gates and acceptance criteria.

## Status

PLANNED. Execution starts at Phase 0 with Chrome baseline and motion-reference study.
