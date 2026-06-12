# EduFlow Motion Phase 3 Loading + Motion Receipt

## Scope

Continue the EduFlow Motion UX/UI Production Track after Phase 0 browser baseline, Phase 1 Stitch concepts, and Phase 2 Figma write blocker. This slice implements the shared motion/loading foundation and fixes the Recharts warning risk found in the baseline.

No production deploy, database migration, seed, or production mutation was performed in this slice.

## Implementation

- Added shared loading primitives in `frontend/src/components/ui/LoadingStates.jsx`:
  - `LoadingProgress`
  - `SkeletonBlock`
  - `RouteLoading`
  - `AuthLoading`
  - `ChartFrame`
  - `SAFE_RECHARTS_CONTAINER_PROPS`
- Replaced the local route-loading skeleton in `frontend/src/App.jsx` with the shared `RouteLoading`.
- Replaced the auth-session wait state in `frontend/src/components/layout/ProtectedRoute.jsx` with `AuthLoading`.
- Hardened `frontend/src/components/ui/PageTransition.jsx` to respect `prefers-reduced-motion`.
- Wrapped Dashboard, Reports, and Advanced Reports charts in stable `ChartFrame` containers.
- Applied `SAFE_RECHARTS_CONTAINER_PROPS` to all 7 current Recharts `ResponsiveContainer` mounts and added `min-w-0` to chart panels/card wrappers.
- Added `frontend/src/design/tokens.js` and `frontend/src/design/motion.js`.
- Added `frontend/src/components/ui/AsyncBoundary.jsx`, `RouteProgress.jsx`, `LoadingScene.jsx`, `Skeletons.jsx`, `ActionProgressButton.jsx`, and `LongOperationStatus.jsx`.
- Integrated table skeletons and `aria-busy` into `DataTable`.
- Integrated modal busy-state handling and async confirm guards into `Modal`.
- Integrated action progress feedback into login, change-password, center settings, and backup/restore drill actions.
- Fixed reviewer findings for modal close races, async confirm failure handling, center-settings reload throws, DataTable keyboard row activation, and `aria-sort` placement.

## RCA

The Phase 0 production baseline found 24 Recharts warnings:

`width(-1) and height(-1) of chart should be greater than 0`

The direct cause was `ResponsiveContainer` mounting before ResizeObserver had a valid dimension. `ChartFrame` stabilized the parent height, but a read-only sidecar review found the Recharts initial dimension still defaults to `-1` unless `initialDimension`, `minWidth`, and `minHeight` are provided. The fix keeps chart logic unchanged and only makes chart containers safe on initial mount and grid resize.

## Team Mode

- Spawned read-only explorer `019eaca4-642a-7f52-a163-8c8596de9744` (`Banach`) to review chart/container risks.
- The explorer completed, reported all 7 `ResponsiveContainer` mounts, and recommended `SAFE_RECHARTS_CONTAINER_PROPS` plus `min-w-0`.
- The agent was closed after findings were integrated.

## Validation

Static gates:

- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed after stopping the local smoke server that held Prisma's Windows engine DLL.
- `npm run test:unit` passed 61/61.
- `git diff --check` passed.

Browser proof on local production bundle:

- Server: `npm run dev:smoke` serving `frontend/dist` and `api/router.ts` on `http://127.0.0.1:3000`.
- Default run: `docs/artifacts/ux-baseline/local-phase3-safe/2026-06-09T13-58-12-656Z/`.
- Reduced-motion run: `docs/artifacts/ux-baseline/local-phase3-safe-reduced/2026-06-09T13-58-41-386Z/`.

Browser summary:

| Run | Scenarios | Console/API/Page errors | Horizontal overflow | Blank pages | Read-only violations |
| --- | ---: | ---: | ---: | ---: | ---: |
| Default Dashboard/Reports desktop+mobile | 4/4 pass | 0 | 0 | 0 | 0 |
| Default + reduced-motion Dashboard/Reports desktop+mobile | 8/8 pass | 0 | 0 | 0 | 0 |
| Final route sweep desktop+mobile | 16/16 pass | 0 | 0 | 0 | 0 |
| Final route sweep default+reduced desktop+mobile | 32/32 pass | 0 | 0 | 0 | 0 |

The generated `console-api-errors.json` files contain empty `console_entries`, `page_errors`, `request_failures`, and `api_failures` arrays for every scenario.

Final browser proof:

- Default final run: `docs/artifacts/ux-baseline/local-phase3-final/2026-06-09T15-01-36-967Z/`.
- Reduced-motion final run: `docs/artifacts/ux-baseline/local-phase3-final-reduced/2026-06-09T15-02-30-688Z/`.
- Routes covered: `/`, `/students`, `/classes`, `/fee-collection`, `/reports`, `/templates`, `/settings`, `/backups`.

## Status

- UXM-2026-06-09-03 is **IMPLEMENTED**.
- Completed: route/auth/table/modal/chart/action/long-operation loading, shared visible progress, reduced-motion page/modal transition, chart-safe wrappers, async confirm guard, and browser proof.
- Remaining UX track work moves to Phase 4 page migrations and Phase 8 deploy/production smoke. Phase 2 Figma write remains blocked until write-capable Figma MCP tools are available.
