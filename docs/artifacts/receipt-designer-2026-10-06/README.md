# Editable Receipt Designer Review

Task: UX-RECEIPT-DESIGNER-01. Local implementation verified; user visual acceptance, physical printing and production rollout remain separate.

Latest 2026-10-07: production rollout verified in [deployment receipt](../../../receipts/2026-10-07-receipt-designer-production.md). Root unit540/540 after test-only CRLF extraction repair. Earlier local-only and root3 failure statements below are historical. GitHub source sync is now authorized; physical printer acceptance remains separate.

## Deliverable

- Eight native editable blocks: header, learner, payment, QR placeholder, signatures, Clay card, Bento pair and print-safe material surface.
- Complete A4/A5 layouts using the existing neutral receipt palette and restrained teal amount accent. No rainbow fields or global theme redesign.
- Click or drag from real previews, grid snapping, movement/scaling, layers, ungroup, text/color/radius/depth properties and Undo/Redo.
- Explicit confirmation replaces the working layout only. Existing saved templates/defaults are not replaced until Save.
- Save retains editable `editor_source` and V2 print background plus absolute dynamic fields. Import of older V2 templates retains their raster artwork and allocated field heights; raster artwork cannot be decomposed into its original layers.
- Financial overflow and unsupported dynamic-text transforms fail visibly rather than silently truncating data. QR is a placeholder, not a payment request.

## Runtime Evidence

Review: http://127.0.0.1:3092/templates/cmuwtih2500048juyzv156yw0/design

Only a new isolated review tenant/template was written in owned local Docker `edu-tpr-20261005`, database/schema `tpr_test_20261005`. Private fixture credentials remain excluded from Git. Production was not touched, reseeded or deployed.

- Chrome dragged a Clay block into the canvas; one Undo returned 38 to 37 layers, Redo restored its name.
- Real API Save/reload retained a grouped block and nested binding at 38 layers. Ungroup preserved world placement; text editor read back `Thong tin bo sung` (Vietnamese spelling in the UI).
- Final regression: grouped payment block survived A5 -> A4 Save/reload -> A5 Save. Groups scale uniformly, keeping dynamic text printable; allocated field heights scale with the page. Print guard messages are actionable Vietnamese.
- Clean final A4/A5 presets each saved/reloaded with 37 native layers and 11 dynamic fields.
- `scripts/receipt-designer-verify.ts` read the exact persisted template and generated real PDFs with synthetic values only, without creating receipt transactions.
- A4: 48,996 bytes, one page, 595.35 x 841.995 pt. A5: 42,139 bytes, one page, 419.58 x 595.35 pt. Both rendered and visually inspected.
- Responsive DOM check: 434px CSS viewport (390px device viewport at browser zoom), document width 434px, no document horizontal overflow. Desktop restored: 2276px document/viewport. Small-screen canvas uses its own scrolling area; desktop remains the primary design surface.
- Native browser screenshot saved as `editor-desktop.png`. The browser's alternate CDP screenshot method timed out; native capture succeeded. One older review tab had a native confirmation; final editor uses the shared accessible Modal instead.

## Checks

- `npm --prefix frontend run test:unit`: 258/258 pass, including actual Fabric raster/group/reload/export/resize tests and real A4/A5 PDF tests with long amounts.
- `node --import tsx --test tests/pdf.test.ts tests/template-render-contract.test.ts tests/template-designer-metadata-roundtrip.test.ts`: 16/16 pass.
- Frontend lint: pass, zero warnings. TypeScript `--noEmit`: pass. Enforced-tenancy frontend build: pass. `git diff --check`: pass.
- Full root unit suite: 536/539 pass. Three existing `tests/attendance-regressions.test.ts` source-extraction failures say `AttendancePage must expose its month denominator resolver`. The attendance page/test have no diff from HEAD; no attendance workaround or test deletion was made.

## Review Corrections

Closed: legacy/V2 geometry refitting on reload, custom properties lost by `toJSON`, duplicate insertion snapshots, allocated binding height loss, group centered-origin placement, ungroup local/world coordinate mismatch, nonuniform group scaling on paper change and unsupported opacity controls on dynamic text/groups.

## Boundaries

This is a receipt composer, not a full Figma clone. Dynamic text cannot rotate, skew, reflect or use non-uniform scaling in the V2 PDF contract. Static decoration is rasterized; dynamic fields remain PDF text. Physical-printer/color fidelity is not certified. Full-suite attendance test repair and authorized deployment require their own follow-up.

Required Stitch `GEMINI_3_1_PRO` was absent from the current tool schema; no unauthorized alternate paid model was used. Figma identity inspection found an unrelated project; it was not edited. The UX orchestrator skill path was unavailable; existing frontend/UI skills, code patterns and the [Claymorphism reference](https://namethatui.com/styles/claymorphism) informed the implementation. Context+ and EDU-scoped Neural Memory were unavailable: manual/markdown mode, NM 0, C+ 0, health unavailable.

## Review Files

- `editor-desktop.png`: final editor after Save/reload.
- `receipt-a4.pdf`, `receipt-a5.pdf`: PDFs generated from saved source.
- `receipt-a4.png`, `receipt-a5.png`: rendered PDF inspections.
- `verification-a4.json`, `verification-a5.json`: saved template counts and PDF metadata.

Next: review the live composer and PDFs, check an actual A4/A5 printer, then authorize sync/deployment when accepted. Preserve production's empty business-data state.
