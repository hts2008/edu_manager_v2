# Designer V2 export helper

Scope: detached frontend export helper, backend critical text fitting, focused tests. No editor integration, deployment, API writes or production mutation.

API: `await buildDesignerPrintConfig(canvas, extraSnapshot)` returns V2 background/bindings/canvas plus `editor_source` and `designer_print.schemaVersion=1`. Pass actual paper metadata and orientation. Only invoke at explicit Save. Reload Fabric from raw `editor_source`; legacy JSON is unchanged until Save. Use `toObject(customProps)` rather than `toJSON(customProps)` for Fabric custom metadata.

Safety: rasterize clone at identity viewport with nested bindings hidden and group caches invalidated. Reject rotated/skewed/reflected/nonuniformly scaled dynamic text, styled/clipped dynamic text, clipped/translucent groups, out-of-page boxes, invalid/oversized background. Static rounded rectangles/shadows rasterize through Fabric. Financial overflow raises 422 from backend fitting; no legacy fallback for V2 errors.

Persistence: current POST/PUT parseJsonConfig preserves unknown keys; Prisma Json and DTO preserve editable metadata. V2 render parser intentionally omits metadata in its return value without mutating raw config. Never persist only parseTemplateRenderContract's output.

Evidence: helper tests 4/4 including actual Chrome/Fabric grouped raster, hidden red binding pixels, source preservation and rotation rejection; PDF/contract tests15/15; root TypeScript check pass; focused ESLint pass. No complete editor save/reload acceptance claimed. Required integration follow-up: actual API POST/PUT/GET editor_source round-trip; A4/A5 portrait/landscape PDF positions/font sizes and long financial values; save/reload undo/group editing with legacy fixtures. Existing legacy renderer remains flow-based, lowercase-type-only, omits shadows and group transforms; this helper bypasses it on Save.

NM/C+ tools unavailable in exposed tool inventory: calls0/0, health unavailable. Shared KANBAN/editor are being edited concurrently by main implementer; this receipt is handoff evidence for that task.
