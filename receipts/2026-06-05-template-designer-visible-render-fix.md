# Template Designer Visible Render Fix - 2026-06-05

## Scope

Fix the production Template Designer issue where upload and add-field/add-component actions reported success, but the object or uploaded image did not appear on the canvas.

## RCA

- Fabric creates a generated `upper-canvas` above the lower rendering canvas.
- The React source canvas had `className="block bg-white"`.
- Fabric copied that class to the generated upper canvas, so the upper canvas had an opaque white CSS background and visually covered all rendered objects on the lower canvas.
- Upload background also used `opacity: 0.24` and image scale capped at `1`, making small uploaded backgrounds hard to see even when successfully added.
- Existing regression coverage asserted state/object count/saved JSON but did not prove visible pixel changes after user actions.

## Implementation

- Removed `bg-white` from the source Fabric canvas so the generated `upper-canvas` remains transparent.
- Added `getUsableCanvas()` guard for canvas-ready/disposed/detached states.
- Disabled add/upload/field controls until the canvas is ready.
- Called `setCoords()` and `requestRenderAll()` after adding objects.
- Changed background image scaling to fit the page and increased default background opacity to `0.72`.
- Strengthened Template Designer E2E coverage to:
  - assert upper canvas transparency,
  - check full-canvas sampled pixel/hash deltas after Text, Field, Rect, image upload, and background upload,
  - fail on page errors, API 5xx, and failed API requests,
  - save/reload and verify persisted visible content.

## Files Changed

- `frontend/src/pages/TemplateDesignerPage.jsx`
- `frontend/e2e/template-designer-hardening.spec.js`

## Verification

- `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --reporter=list --output=playwright-template-visible-results-3` passed 1/1.
- `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --headed --reporter=list --output=playwright-template-visible-headed-results` passed 1/1 in Chrome.
- `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --reporter=list --output=playwright-template-visible-results-final` passed 1/1 after final control-disabled patch.
- `npm --prefix frontend run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 46/46.
- `npm run build` passed locally.
- `git diff --check` passed with LF/CRLF warnings only.
- Vercel production deploy `dpl_8KRG5ePFEqeKNLZxZZdb9cMjdNg6` is Ready and aliased to `https://edu-manager-gules.vercel.app`.

## Production Browser Smoke

Target: `https://edu-manager-gules.vercel.app/templates/cmp6dbue800s9gcyrkhbzw8tj/design`

Chrome/Playwright production smoke performed:

- login with approved smoke account,
- open Templates and first Template Designer link,
- wait for `Canvas san sang`,
- assert `upper-canvas` background is transparent before and after actions,
- click Text,
- click dynamic field `receipt_id`,
- upload image through the real production upload endpoint,
- upload background image through the real production upload endpoint,
- verify canvas pixel/hash changes after every action,
- verify no page errors, no API 500s, and no API request failures.

Production metrics:

```json
{
  "upper_before": "rgba(0, 0, 0, 0)",
  "upper_after": "rgba(0, 0, 0, 0)",
  "before_checksum": 15329435,
  "after_text_checksum": 15326908,
  "after_field_checksum": 15319425,
  "after_image_checksum": 15321001,
  "after_background_checksum": 15322367,
  "selection": "Dang chon: Background image",
  "object_count": "17 object(s)",
  "upload_status": "Da them anh nen.",
  "runtime_errors": []
}
```

## Safety Notes

- Production smoke uploaded two small test images to Vercel Blob to verify the real upload pipeline.
- The template was not saved during production smoke, so no production template JSON was intentionally mutated by the smoke.
- No Prisma migration or seed was run.

## Status

IMPLEMENTED.
