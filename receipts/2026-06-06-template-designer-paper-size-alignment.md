# Template Designer Paper Size + Canvas Alignment Closeout - 2026-06-06

## Scope
- Add A4, A5, A6, and custom paper-size controls directly inside Template Designer.
- Fix existing-template alignment drift by saving/restoring effective paper and canvas dimensions in template JSON.
- Keep production DB schema stable: no Prisma migration, no seed, no enum expansion required.

## RCA
- `TemplateDesignerPage.jsx` previously derived canvas size only from DB `paper_size`, whose enum did not include A6 or custom dimensions.
- Fabric JSON did not carry page/canvas metadata, so existing objects could be reloaded against a different visible canvas and appear shifted or clipped.
- PDF generation also read fixed `paperSize` values, so a designer canvas could diverge from printed output.
- `TemplatesPage.jsx` metadata edit could send `json_config: '{}'` from list data that omitted the real `json_config`, risking layout wipe.

## Implementation
- Added designer paper model:
  - Presets: A4, A5, A6.
  - Custom width/height in mm with safe min/max clamping.
  - Effective metadata stored in `json_config.paper` and `json_config.canvas`.
- Added canvas resize behavior:
  - Removes grid before resize.
  - Scales and fits exportable Fabric objects into the new page.
  - Restores paper metadata through undo/redo snapshots.
  - Saves only exportable objects plus page metadata.
- Added backend/PDF compatibility:
  - `lib/pdf.ts` now reads custom or preset paper metadata from JSON before falling back to DB paper size.
  - `server/api/templates/[id]/index.ts` ignores invalid enum paper values instead of passing them to Prisma.
  - `TemplatesPage.jsx` no longer sends `json_config` during metadata-only edits.

## Files Changed
- `frontend/src/pages/TemplateDesignerPage.jsx`
- `frontend/src/pages/TemplatesPage.jsx`
- `frontend/e2e/template-designer-hardening.spec.js`
- `lib/pdf.ts`
- `server/api/templates/[id]/index.ts`
- `tests/pdf.test.ts`

## Validation
- `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --reporter=list --output=playwright-template-paper-results`
  - Result: 1/1 passed.
- `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --project=chromium --headed --reporter=list --output=playwright-template-paper-headed-results`
  - Result: 1/1 passed.
- `npm --prefix frontend run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run test:unit`
  - Result: 47/47 passed.
- `npm run build`
  - Result: passed.
- `git diff --check`
  - Result: passed with LF/CRLF warnings only.

## Production Deploy
- Command: `npx vercel deploy --prod --yes`
- Deployment: `dpl_7vvKWQfjvgTJXQCSpMM52D2AtoYH`
- Alias: `https://edu-manager-gules.vercel.app`
- Status: Ready.

## Production Smoke
- Target: default receipt template `cmp6dbuc900s7gcyrty4jd0ik`.
- Actions:
  - Logged in with the existing admin smoke account.
  - Opened Template Designer on production.
  - Switched paper to A6 and verified canvas `397x559`.
  - Switched paper to custom `120x180mm` and verified canvas `454x680`.
  - Added Text and `receipt_id` field.
  - Verified visible non-white pixels and `15 object(s)`.
  - Captured screenshot: `receipts/artifacts/template-paper-prod-smoke.png`.
- Safety:
  - Did not click Save.
  - No production template JSON mutation.
  - No Prisma migration or seed.
- Runtime result:
  - No page errors.
  - No API 500 errors.
  - No failed API requests.

## Residual Risk
- This closeout makes designer canvas size and PDF page size share the same metadata. It does not fully convert Fabric object rendering to absolute-position WYSIWYG PDF coordinates; that should be a separate renderer task if exact print fidelity is required.
