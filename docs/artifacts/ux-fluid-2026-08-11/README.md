# UX Fluid Layout Evidence - 2026-08-11

## Scope

- Removed the global `1600px` cap from the authenticated `MainLayout` content track.
- Added viewport-adaptive gutters from `16px` to `48px`.
- Made Student Progress KPI and chart grids responsive from mobile through ultrawide.
- Kept local constraints such as dialogs and the full-screen Template Designer unchanged.

## Design Reference

- Stitch project: `5084496326021058210`
- Design system asset: `assets/9c0c3259747c46bdb0fa12c1560cf5bb`
- Generated with required model: `GEMINI_3_1_PRO`
- Ultrawide reference screen: `6afce34000f24e7a875b51b00a3007aa`
- Stitch session: `14710425614820185586`

## Browser Matrix

`frontend/e2e/fluid-shell.spec.js` passed at:

| Viewport | Chart columns | Evidence |
| --- | ---: | --- |
| 390x844 | 1 | `mobile-390x844.png` |
| 768x1024 | 1 | `tablet-portrait-768x1024.png` |
| 1024x768 | 1 | `tablet-landscape-1024x768.png` |
| 1440x900 | 2 | `desktop-1440x900.png` |
| 1920x1080 | 2 | `wide-desktop-1920x1080.png` |
| 2560x1440 | 4 | `ultrawide-2560x1440.png` |

The test also verifies no document-level horizontal overflow, balanced page gutters, and that the shared `<main>` consumes at least 99% of its content track.

`frontend/e2e/fluid-routes.spec.js` passed all 24 authenticated `MainLayout` routes at 1920x1080 and 2560x1440: 48/48 scenarios.

## Static Gates

- Root unit: 523/523 passed.
- Frontend unit: 58/58 passed.
- Fluid Student Progress E2E: 6/6 passed.
- Authenticated route matrix E2E: 48/48 passed.
- TypeScript: passed.
- Frontend ESLint: passed with zero warnings.
- Production build: passed (2968 modules).
- Independent reviewer: deploy `GO`.

