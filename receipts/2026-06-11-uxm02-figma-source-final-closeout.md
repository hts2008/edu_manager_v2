# UXM-02 Figma Source-Of-Truth Final Closeout

## Scope

Close `UXM-2026-06-09-02` for the EduFlow Motion UX/UI track after the
Figma Desktop plugin pass created native, inspectable Figma artifacts.

This closeout covers design-system/source-of-truth evidence only. It does not
claim a new runtime UI deploy, because this slice did not change production app
source code.

## Final Acceptance

Accepted source-of-truth nodes:

| Artifact | Figma node | Acceptance reason |
| --- | --- | --- |
| Native primary button component | `49:436` | Reusable component, primary color variable bound |
| Native secondary button component | `49:438` | Reusable component for secondary actions |
| Native ready status chip | `49:440` | Reusable status component, warning-soft variable bound |
| Native paid status chip | `49:442` | Reusable status component for paid/success state |
| Native finance nav item | `49:444` | Reusable active nav component, primary/primarySoft variables bound |
| Desktop Fee Workbench current frame | `49:447` | Linked implementation frame using component instances and variables |
| Mobile Fee Workbench current frame | `49:472` | Linked mobile frame using component instances and variables |

Figma MCP verification performed in the final closeout pass:

- `get_design_context(49:447)` succeeded and returned implementation-oriented
  React/Tailwind handoff code with component instances.
- `get_design_context(49:472)` succeeded and returned mobile implementation
  context.
- `get_variable_defs(49:447)` returned:
  `color/brand/primary`, `color/brand/primarySoft`, `color/surface/card`,
  `color/border/default`, `color/status/warningSoft`, and `color/surface/canvas`.
- `get_metadata(49:447)` showed `49:451`, `49:468`, and `49:470` as component
  instances inside the desktop implementation frame.
- `get_screenshot(49:447, contentsOnly=true)` rendered the desktop frame.
- `get_screenshot(49:472, contentsOnly=true)` rendered the mobile frame.

Additional evidence from the preceding plugin pass:

- Local Figma plugin: `tools/figma-eduflow-source-plugin`.
- Syntax gate: `node --check tools/figma-eduflow-source-plugin/code.js`.
- Receipt screenshot:
  `receipts/artifacts/figma-native-source-plugin-2026-06-11.png`.

## Implementation Mapping

The accepted Figma source maps to the already implemented/deployed EduFlow
Motion UI:

| Figma source | Runtime implementation |
| --- | --- |
| `color/brand/primary`, `color/brand/primarySoft`, surfaces, border | `frontend/src/design/tokens.js` |
| Finance navigation keeps one `Thu tien` / fee collection entry | `frontend/src/components/layout/Sidebar.jsx` |
| Fee Workbench title, metrics, and per student-class-month policy | `frontend/src/pages/FeeCollectionPage.jsx` |
| Shared loading/motion and operational shell primitives | `frontend/src/components/ui/*`, `frontend/src/App.jsx` |

The Figma node text intentionally uses ASCII-safe Vietnamese without diacritics
because the Figma plugin and existing markdown files already run through
mixed Windows encodings. The runtime app remains Vietnamese-first.

## Deploy Decision

No new Vercel production deploy was run for this closeout.

Reason:

- The final pass changed project-control/evidence files only.
- The runtime UI code had already been implemented and production-smoked in
  `UXM-2026-06-09-03` through `UXM-2026-06-09-08`.
- A deploy without app source changes would not publish a meaningful UX delta
  and would add release noise.

If a future pass changes React/Tailwind source after comparing against these
Figma nodes, that future pass must run the normal deploy gate.

## Status

`UXM-2026-06-09-02` is accepted as `IMPLEMENTED`.

Residual design improvements such as richer dashboard/report/template frames,
prototype interactions, or more component variants should be planned as a new
UX enhancement batch, not as a blocker for this Phase 2 closeout.
