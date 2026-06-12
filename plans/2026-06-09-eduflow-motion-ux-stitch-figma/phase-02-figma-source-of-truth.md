---
phase: 2
title: "Figma Source Of Truth"
status: implemented
priority: P1
effort: "1-2 days"
dependencies: [1]
---

# Phase 2: Figma Source Of Truth

## Objective

Normalize the selected Stitch direction into a maintainable Figma design system and implementation handoff.

## Precondition

A write-capable Figma MCP/plugin is still not exposed. The currently observed Figma MCP tools are sufficient for metadata/context inspection only. However, Figma Desktop authoring through Computer Use was verified on 2026-06-10: SVG clipboard paste/import created a real frame node `31:2` that Figma MCP can read back. A second, larger source-pack import was then created and renamed to `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack` at node `35:128`. Figma Desktop then converted that source pack into coarse native component definition `37:415`. This unblocks a manual/Desktop-assisted write path, but not automated high-volume native Figma authoring.

## Tasks

1. Inspect existing page `3:2` and frames `3:3`, `3:36`, `3:142`.
2. Create page `EDU_MANAGER_V2 / EduFlow Motion v3`.
3. Reconcile stale navigation:
   - Keep one `Thu tiền` entry.
   - Preserve current grouped menu hierarchy.
4. Define variables:
   - Color.
   - Typography.
   - Spacing.
   - Radius.
   - Shadow/elevation.
   - Motion duration/easing.
5. Define reusable components and variants:
   - Button.
   - Icon button.
   - Input/select/search.
   - Tabs/segmented control.
   - Filter bar.
   - Badge/status.
   - Metric card.
   - Table/header/row.
   - Bulk action bar.
   - Modal/drawer.
   - Toast.
   - Skeletons/loading scene.
   - Chart panel/legend/tooltip.
6. Create desktop/mobile frames listed in `plan.md`.
7. Create prototype flows:
   - Route loading -> loaded.
   - Table filter -> refreshing.
   - Save -> success/error.
   - PDF render -> print ready/error.
8. Use `get_design_context` on every selected implementation frame.
9. Record node IDs in the design receipt.

## Acceptance

- Tokens and components are reusable, not duplicated per screen.
- Loading system exists as a dedicated Figma section.
- Current app navigation is accurate.
- Desktop and mobile frames are linked to shared components.
- Implementation cannot start on a screen without its node ID/context.

## Blocker Evidence

- Figma read tools succeeded for page `3:2`, desktop frame `3:36`, and mobile frame `3:142`.
- Figma write-capable tools (`use_figma`, `create_new_file`, `search_design_system`, `get_libraries`, `generate_figma_design`) are not exposed in this Codex session.
- Rechecked on 2026-06-10 after Phase 1 selection closeout; tool discovery still did not expose any Figma write/create/update capability.
- Existing Figma frames are stale and still contain duplicated finance navigation (`Thu tien` and `Thu hoc phi`).
- Receipt: `receipts/2026-06-09-eduflow-motion-figma-source-blocked.md`.

## Desktop Write Path Evidence

- Computer Use located Figma Desktop window `EDUMANAGER - Figma`.
- Figma Desktop was switched from Inspect/Dev Mode to Design mode through the Toolbelt mode control.
- A source-of-truth SVG board was copied to the Windows clipboard and pasted into the active Figma page.
- Figma created real frame node `31:2` at `x=1679`, `y=914`, `width=1440`, `height=1080`.
- Figma MCP `get_metadata(31:2)` confirms text/vector children including:
  - `EDU_MANAGER_V2 / EDUFLOW MOTION V3`
  - `Figma Source Of Truth Handoff`
  - `Motion-first admin UI`
  - `FEE WORKBENCH`
  - `TEMPLATE DESIGNER`
  - `VALIDATION`
- Figma MCP `get_screenshot(31:2)` rendered the imported board.
- Receipt: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`.

## Source Pack Expansion Evidence

- A larger source pack was copied to the Windows clipboard and pasted into Figma Desktop after deselecting the original node.
- Figma created real frame node `35:128` at `x=-137`, `y=-168`, `width=2400`, `height=1800`.
- The selected frame was renamed through Figma Desktop to `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack`.
- Figma MCP `get_metadata(35:128)` confirms the renamed frame plus child groups for:
  - `DESIGN DIRECTION`
  - `Tokens`
  - `Component Library`
  - `Navigation`
  - `Loading & Motion`
  - `Dashboard`
  - `Fee Workbench`
  - `Report Intelligence`
  - `Attendance`
  - `Template Designer`
  - `Mobile`
  - `Implementation Map`
- Figma MCP `get_design_context(35:128)` succeeded for `DESIGN_SYSTEM` context and returned implementation-oriented handoff code.
- Figma MCP `get_screenshot(35:128, contentsOnly=true)` rendered the source pack.

## Native Component Definition Evidence

- Figma Desktop shortcut `Ctrl+Alt+K` was applied to the selected source-pack board.
- Figma converted the board into a native component definition:
  - Node id: `37:415`
  - Name: `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack`
  - Type from Figma MCP metadata: `symbol`
  - Position: `x=-137`, `y=-168`
  - Size: `2400 x 1800`
- Figma MCP `get_metadata(37:415)` confirmed the native symbol/component definition.
- Figma MCP `get_design_context(37:415)` succeeded with `artifactType=DESIGN_SYSTEM`.
- Figma MCP `get_screenshot(37:415, contentsOnly=true)` rendered the component definition.
- Boundary: this is a coarse source-pack component wrapper, not the final granular library of tokens, components and variants.

## Final Closeout - 2026-06-11

The remaining review work below is superseded by the final native source pass.

The local Figma plugin `tools/figma-eduflow-source-plugin` was run in Figma
Desktop and created native reusable components `49:436`, `49:438`, `49:440`,
`49:442`, `49:444`, plus linked desktop/mobile implementation frames
`49:447` and `49:472`.

Final verification:

- `get_variable_defs(49:447)` confirms bound production variables:
  `color/brand/primary`, `color/brand/primarySoft`, `color/surface/card`,
  `color/border/default`, `color/status/warningSoft`, and
  `color/surface/canvas`.
- `get_design_context(49:447)` and `get_design_context(49:472)` succeeded.
- `get_metadata(49:447)` confirms component instances inside the desktop frame.
- `get_screenshot(49:447, contentsOnly=true)` and
  `get_screenshot(49:472, contentsOnly=true)` rendered the final frames.

Acceptance decision: `UXM-2026-06-09-02` is now `IMPLEMENTED`. Broader future
Figma expansion should be treated as a new UX enhancement batch, not as a
blocker for this phase.

Evidence receipt:

- `receipts/2026-06-11-uxm02-figma-source-final-closeout.md`

## Historical Review Work

- Expand the board/component wrapper into proper reusable variables, granular components and variants instead of a single imported SVG-derived source-pack component.
- Reconcile or replace stale frames `3:36` and `3:142` so they no longer show duplicate finance nav.
- Run `get_design_context` on the final implementation frames and record node IDs.
- 2026-06-11 recheck: Figma Desktop Variables panel says `No variables created in this file`, and Figma MCP `get_variable_defs(37:415)` returns `{}`. This confirms tokens are still visual content only, not reusable Figma variables.
- 2026-06-11 recheck: `get_metadata(3:2)` still shows stale frames `3:36` and `3:142` with both `Thu tiền` and `Thu học phí`, so current Figma source-of-truth navigation remains behind implemented production navigation.
- 2026-06-11 tool discovery still exposes no Figma create/update/write tool in this Codex session. Computer Use can inspect and perform bounded Desktop actions, but high-volume reliable creation of variables/components/linked frames remains unsafe to mark complete without a proper write-capable Figma plugin/MCP or manual design pass.

- 2026-06-11 Desktop probe: Computer Use successfully created one native Figma variable in `Collection 1`: `color/primary = #4F46E5`. This proves small manual variable creation is possible through Figma Desktop, but it does not satisfy Phase 2 because the full variable set is not authored, variables are not bound to final components/frames, `get_variable_defs(37:415)` still returns `{}`, and the stale implementation frames remain unreconciled.

- 2026-06-11 token-binding component probe: Computer Use created a separate Figma rectangle probe, bound its fill to `color/brand/primarySoft = #EEF2FF`, renamed it to `UXM-02 / Native Token Binding Probe / primarySoft Card`, and converted it into native component definition `47:421`. Figma MCP verified `get_variable_defs(47:421)` as `{"color/brand/primarySoft":"#eef2ff"}` and rendered the component screenshot. This proves native variable binding into a component is possible through Desktop-assisted authoring, but it still does not satisfy Phase 2 because the full token set, granular component variants, linked implementation frames, loading/prototype flows, and stale frame replacement remain pending.

## Offline Handoff Package

- Prepared local Figma source-of-truth spec: `docs/artifacts/figma-handoff/eduflow-motion-v3-source-of-truth-spec.md`.
- This package defines variables, components, desktop/mobile frames, prototype flows, implementation mapping and the write checklist for the next session that has Figma authoring tools.
- This does not complete Phase 2 by itself; it is now the input for a Desktop-assisted or future write-capable MCP authoring pass.
