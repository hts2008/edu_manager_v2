# Fee Workbench Filter Overlap Hotfix - 2026-07-17

## Scope

Fix the Fee Workbench Month/Class filter collision that covered the month picker and next-month button.

## RCA

At `xl`, the summary grid allocated a narrow first card while the card's child used viewport-based `sm:grid-cols-2`. The native month input retained intrinsic width, overflowed its grid track, and the subsequently painted class `select` covered the overflowed hit area.

## Changes

- Reserved a bounded minimum width for the filter card.
- Stacked Month and Class inside that card.
- Used `grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]` for the month controls.
- Added `min-w-0`, full-width inputs, 44px arrow targets, accessible labels and stable test IDs.
- Added `frontend/tests/fee-collection-layout-contract.test.js`.

## Verification

- Root unit: `467/467` pass.
- Frontend unit: `35/35` pass.
- Layout contract: `3/3` pass.
- `npx tsc --noEmit`: pass.
- Frontend lint and focused ESLint: pass.
- Root production build: pass.
- `git diff --check`: pass.

Authenticated Chrome used the production API and verified the new bundle locally, then repeated the same scenario on the production alias:

- Month changed from `2026-07` to `2026-08`.
- Class selection changed from `all` to a real class.
- Month input received keyboard focus.
- Desktop `1440x900`: month/class intersection area `0`; no horizontal overflow.
- Mobile `390x844`: month/class intersection area `0`; no horizontal overflow.
- Previous/next hit targets: `44x44` pixels.

## Release

- Commit: `a0a88d6`.
- Deployment: `dpl_4qvTE4aRpypeAZXq68AaprY15U2q` (`READY`).
- Alias: `https://edu-manager-gules.vercel.app`.
- Inspector: `https://vercel.com/hts2008s-projects/edu-manager/4qvTE4aRpypeAZXq68AaprY15U2q`.

## Artifacts

- `docs/artifacts/fee-filter-2026-07-17/local-desktop.png`
- `docs/artifacts/fee-filter-2026-07-17/local-mobile.png`
- `docs/artifacts/fee-filter-2026-07-17/production-desktop.png`
- `docs/artifacts/fee-filter-2026-07-17/production-mobile.png`

No production data mutation was performed by this UI smoke.
