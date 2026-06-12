# EduFlow Motion Figma Source-Of-Truth Blocker Receipt

> 2026-06-10 update: this receipt remains accurate for Figma MCP write capability. The blocker is no longer absolute because a Figma Desktop Computer Use path has since been verified. See `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`.

## Scope

Verify whether Phase 2 can create/update the Figma source-of-truth for the EduFlow Motion UX/UI track in this Codex session.

## Tool Discovery

Deferred tool search for Figma write capabilities returned no tools for:

- `use_figma`
- `create_new_file`
- `search_design_system`
- `get_libraries`
- `generate_figma_design`

Recheck on 2026-06-10 after Phase 1 selection closeout still exposed no Figma write/create/update tool. The additional discovered tools were for subagent management and Codex app automation, not Figma authoring.

Available Figma MCP tools in this session are read/inspect oriented:

- `get_metadata`
- `get_design_context`
- `get_screenshot`
- `get_variable_defs`

## Figma Evidence

- Existing top-level page: `3:2` - `EDU_MANAGER_V2 Production UX`.
- Existing frames:
  - `3:3` - `Design Tokens / Production`.
  - `3:36` - `Desktop / Receipts Shell`.
  - `3:142` - `Mobile / Navigation Drawer`.
- `get_screenshot(3:36)` and `get_design_context(3:36)` succeeded.
- `get_metadata(3:2)` and `get_screenshot(3:142)` succeeded.

## Findings

- Frame `3:36` is stale relative to the current production UX plan. It still shows a finance navigation split with both `Thu tien` and `Thu hoc phi`.
- Frame `3:142` mobile drawer also still contains both `Thu tien` and `Thu hoc phi`.
- The current source-of-truth page does not contain the new Stitch project `projects/5084496326021058210`, design-system asset `assets/9c0c3259747c46bdb0fa12c1560cf5bb`, or the new dashboard/fee/reports/template/mobile concepts.
- Because no write-capable Figma tool is exposed, this session cannot create page `EDU_MANAGER_V2 / EduFlow Motion v3`, variables, components, frames, or prototypes.

## Decision

Phase 2 is BLOCKED in this session. Do not claim that Figma has been synchronized. React implementation may proceed only as a code-side vertical slice using the Stitch evidence and existing Figma read context as references, while recording that final Figma source-of-truth write-back remains pending.

## Required Unblock

Expose a write-capable Figma MCP/tool such as `use_figma` or `create_new_file`, then run Phase 2 again:

1. Create or update page `EDU_MANAGER_V2 / EduFlow Motion v3`.
2. Remove duplicate finance nav from the source-of-truth.
3. Create tokens/components/loading system.
4. Create frames for shell, dashboard, master data, attendance, finance, reports, Template Designer and mobile.
5. Run `get_design_context` for each implementation frame and record node IDs.

## Offline Package Prepared

Local handoff package prepared for the future Figma write pass:

- `docs/artifacts/figma-handoff/eduflow-motion-v3-source-of-truth-spec.md`

This package is implementation-aligned and covers variables, components, desktop/mobile frames, prototype flows and the write checklist. It does not mean Figma was updated.
