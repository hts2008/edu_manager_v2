# Core Skills And Clay Receipts

User requests removal of homework/daily practice/mock-test criteria from report and circled inputs, plus A4/A5 Clay receipt templates. Two atomic slices tracked UX-PROGRESS-CORE-03 / UX-RECEIPT-CLAY-01.

Report: filter only presentation to listening/speaking/reading/writing; remove extra score controls, retain note/exam context and legacy historical evidence/replay/calculations. Do not delete database rows or silently recalculate tuition/progress. Radar four axes, print table four rows, overview four skill bars.

Receipt: existing Fabric fallback prints sequential objects, so visual parity requires existing V2 full-page background PNG and absolute bindings. Use scoped Clay preset dialog instead of incompatible legacy Fabric route for these templates. A4/A5 portrait, pastel Bento, editable center/contact/header/footer, signature spaces and explicit nonfunctional QR placeholder. Save only on explicit action through existing tenant template APIs, not auto-default/receipt financial writes. Add formatted amount display field without changing stored amount or calculations. Backend renders existing V2 contract; no migrations/dependencies.

Cause-effect: canvas background preserves Clay appearance in server PDF; dynamic bindings keep receipt values real. Dedicated dialog recognizes preset metadata after fetching full template because list omits config. Preserve older template workflow and default selection. Test first, unit/mounted-browser/safe serialization/PDF proof, server PDF generation and fixture-only template persistence. No physical-printer/production claim; user visual acceptance remains.

Manual tools mode: NM/C+ unavailable; UX orchestrator file missing, mandatory Stitch model unavailable, unrelated Figma document not changed. Existing source/NameThatUI clay reference used. Parent handles progress/integration, delegated worker handles new receipt component/config/tests with disjoint write set.
