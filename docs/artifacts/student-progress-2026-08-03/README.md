# Student Progress Dashboard Production Evidence

## Runtime

- Canonical alias: `https://edu-manager-gules.vercel.app`
- Final deployment: `dpl_215rbfRy5TrpY8UMZpEb6LoPXGys`
- Application commits: `3f22dd5`, `c23d9a9`

## Files

- `production-detail-desktop.png`: authenticated production detail dashboard after list-to-detail navigation. The page rendered charts, timeline/editor sections and no horizontal document overflow.
- `production-parent-pdf-preview.png`: pre-hotfix defect evidence captured after the original fixed-time object URL had expired. This is intentionally retained as RCA evidence, not success evidence. Commit `c23d9a9` replaced timeout cleanup with preview-window lifecycle cleanup.

## Final asset verification

The exact `pdfPrint-CSHid9Aa.js` file served by the canonical alias returned HTTP 200, contained `beforeunload` and `pagehide`, and contained neither `60000` nor `120000`. This proves the final alias serves the PDF lifecycle hotfix.
