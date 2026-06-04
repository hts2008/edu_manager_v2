# 2026-06-04 - Template Designer Legacy Canvas Fix

## Scope
- Fix production Template Designer stuck at `Dang khoi tao canvas...` for the default receipt template.
- Keep the fix scoped to the designer canvas lifecycle and regression coverage.

## RCA
- Production probe opened `https://edu-manager-gules.vercel.app/templates/cmp6dbuc900s7gcyrty4jd0ik/design`.
- Before fix, the page stayed at `Dang khoi tao canvas...13 object(s)`, save was disabled, and browser runtime logged `Cannot read properties of undefined (reading 'save')`.
- The production default receipt template returned legacy `json_config`: `{"version":"1.0","elements":[]}`.
- `TemplateDesignerPage` passed that legacy shape to Fabric `loadFromJSON()`. In React StrictMode/Fabric lifecycle, the async init path could continue into `renderAll()` against an invalid top-layer context before `canvasReady` was set.

## Implementation
- `frontend/src/pages/TemplateDesignerPage.jsx`
  - Added `normalizeTemplateConfig()` so unsupported legacy `elements` JSON is not passed to Fabric `loadFromJSON()`.
  - Added guarded Fabric disposal and `canvasInitIdRef` checks so stale async init paths cannot render or update state after cleanup.
  - Added safe layer helpers for `sendObjectToBack`, `bringObjectToFront`, forward, and backward operations.
  - Render errors now surface as designer status instead of leaving the page in a loading state.
- `frontend/e2e/template-designer-hardening.spec.js`
  - Regression fixture now uses the legacy production-style `{ version: "1.0", elements: [] }` config.

## Verification
- Local production-shape Playwright probe:
  - Status became `Canvas san sang. JSON mau in cu da duoc scaffold mac dinh.13 object(s)`.
  - Stage overlay was empty.
  - Save button was enabled.
  - No page errors.
- Local E2E:
  - `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --reporter=list --output=playwright-template-fix-results`
  - Result: 1/1 passed.
- Static/build gates:
  - `npm --prefix frontend run lint` passed.
  - `npx tsc --noEmit` passed.
  - `npm run test:unit` passed 46/46.
  - `npm run build` passed.
- Deploy:
  - Commit: `5e1b907 fix: unblock legacy template designer canvas`.
  - Vercel deployment: `dpl_EGoc3DQj6qYhSkFPxehw8LVUdHHt`.
  - Alias: `https://edu-manager-gules.vercel.app`.
- Production smoke:
  - Opened default receipt template `cmp6dbuc900s7gcyrty4jd0ik`.
  - Added Text + `receipt_id` field.
  - Result state: `15 object(s)`, selection `Field: receipt_id`, save enabled, stage overlay empty, no page errors.
- Production E2E:
  - `E2E_BASE_URL=https://edu-manager-gules.vercel.app npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --reporter=list --output=playwright-template-fix-prod-results`
  - Result: 1/1 passed.

## Safety
- No Prisma migration, seed, or production data mutation was run.
- The production UI probe only logged in, read templates, opened the designer, and added unsaved local canvas objects.

## Residual Risk
- Existing default templates may still store legacy `elements` config until an admin saves them in the designer.
- The designer now safely scaffolds those legacy templates and will persist Fabric `objects` JSON after save.
