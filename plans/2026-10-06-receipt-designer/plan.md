# Editable Receipt Designer

Scope: compose receipts from native editable Fabric blocks, preserving existing templates until explicit save. No production data, defaults or deployment changes.

Status: IMPLEMENTED locally. All four steps below verified; user visual/printer acceptance and rollout remain separate. Evidence: `receipts/2026-10-06-receipt-designer.md` and `docs/artifacts/receipt-designer-2026-10-06/README.md`.

1. Add restrained system-palette Clay/Bento/material blocks and complete A4/A5 layouts.
2. Integrate click/drag placement, explicit replace confirmation, editable grouped children, radius and depth properties, undo/redo.
3. Save editable source alongside V2 print background and absolute dynamic bindings. Reject unsupported financial binding geometry rather than printing incorrectly.
4. Verify unit/export contracts, lint/build, browser save/reload/drag placement and PDF rendering. Physical-printer acceptance remains separate.

Risk chain: groups/scale -> legacy flow PDF divergence -> incorrect receipt presentation. Use print-safe flattened decoration with dynamic overlays; retain layer source for reload.

Design reference: https://namethatui.com/styles/claymorphism. Stitch required GEMINI_3_1_PRO unavailable in current schema; no alternate paid generation. Active Figma file belongs to another project and is not modified. Missing ux-design-orchestrator skill; existing UI/UX/frontend skills and system palette used. Context+/Neural Memory unavailable; manual/markdown-only mode.
