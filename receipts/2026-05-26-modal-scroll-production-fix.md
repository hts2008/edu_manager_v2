# Modal Scroll Production Fix - 2026-05-26

## Scope
- Fixed the reported issue where long edit/create modals could not be scrolled far enough to reach bottom fields and save actions.
- Affected shared modal consumers include class, student, parent, teacher, payment, receipt, templates, fee collection, and attendance review surfaces.

## Root Cause
- The shared `Modal` component rendered inline under animated page content.
- Page wrappers use Framer Motion transforms/filters and the app shell has its own scroll container, so `position: fixed` was not reliably fixed to the viewport.
- Chrome production probe before the fix showed the class dialog outside the viewport; even after modal-body scroll, the submit button remained below the viewport.
- A secondary layout issue came from double vertical padding around the modal shell, which could still push a tall dialog a few pixels below the viewport.

## Implementation
- Portaled the shared modal to `document.body` with `createPortal`.
- Preserved/restored the previous `document.body.style.overflow` value when opening/closing modals.
- Changed the modal overlay to a viewport-contained `box-border` shell.
- Removed double vertical padding and made the panel `max-h-full`.
- Kept only the modal body as the vertical scroll region with `overscroll-contain`.
- Added Chrome-channel e2e coverage that opens and scrolls modal actions for `/classes`, `/students`, `/parents`, `/teachers`, `/payments`, and `/receipts`.

## Local Evidence
- `npm run build` passed.
- `npx tsc --noEmit` passed.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run test:unit` passed 39/39.
- Chrome-channel focused modal smoke passed 1/1 locally.
- Chrome-channel full UX smoke passed 11/11 locally.
- Chrome-channel Phase-B smoke passed 17/17 locally.
- `git diff --check` passed with LF/CRLF warnings only.

## Production Evidence
- Implementation commit `8819718` pushed to `origin/main`.
- Vercel production deployment `dpl_3TTwAgFMPEzeM8zfa5Q3A8RWYGDn` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- Production focused modal smoke passed 1/1.
- Production full UX smoke passed 11/11.
- Production Phase-B smoke passed 17/17.

## Safety
- No Prisma migration, seed, or destructive production mutation was run.
- Production verification used login/read/navigation/PDF probes and non-mutating UI flows.
