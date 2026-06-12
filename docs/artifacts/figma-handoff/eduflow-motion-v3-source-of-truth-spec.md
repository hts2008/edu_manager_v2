# EDU_MANAGER_V2 / EduFlow Motion v3 - Figma Source-Of-Truth Spec

Date: 2026-06-10
Status: Offline handoff package ready; Figma writeback blocked by missing write-capable MCP tool.

## Purpose

This artifact is the implementation-aligned Figma handoff package for the selected Stitch direction `Calm Operations + Motion Data Command`.

It does not claim that Figma has been updated. It exists so the next session with write-capable Figma tools can create the Figma page, variables, components, frames and prototypes without redoing product analysis.

## Source Evidence

- Stitch project: `projects/5084496326021058210`
- Stitch design-system asset: `assets/9c0c3259747c46bdb0fa12c1560cf5bb`
- Phase 1 closeout score: `95/100`
- Production deployment evidence: `receipts/2026-06-10-eduflow-motion-phase8-production-closeout.md`
- Current Figma blocker: `receipts/2026-06-09-eduflow-motion-figma-source-blocked.md`

## Figma Page To Create

Page name:

`EDU_MANAGER_V2 / EduFlow Motion v3`

Top-level sections:

1. `00 / Design Tokens`
2. `01 / Components`
3. `02 / Loading And Motion`
4. `03 / Desktop Frames`
5. `04 / Mobile Frames`
6. `05 / Prototype Flows`
7. `99 / Deprecated Reference`

Move or duplicate old frames `3:36` and `3:142` into `99 / Deprecated Reference` and mark them stale because they still contain split finance navigation.

## Variables

### Color

| Variable | Value | Usage |
| --- | --- | --- |
| `color/brand/primary` | `#4f46e5` | Primary actions, selected nav, active tabs |
| `color/brand/primarySoft` | `#eef2ff` | Selected row, soft action surface |
| `color/brand/accent` | `#06b6d4` | Secondary highlight, loading gradient |
| `color/status/success` | `#059669` | Paid, online, completed |
| `color/status/warning` | `#f59e0b` | Ready/review/warning |
| `color/status/danger` | `#e11d48` | Delete, failed, overdue |
| `color/surface/default` | `#ffffff` | Panels, cards, tables |
| `color/surface/muted` | `#f8fafc` | Page background, table header |
| `color/border/default` | `#e2e8f0` | Panel/table/control border |
| `color/text/default` | `#0f172a` | Primary copy |
| `color/text/muted` | `#64748b` | Supporting copy |

### Radius

| Variable | Value | Usage |
| --- | --- | --- |
| `radius/control` | `12px` | Inputs, buttons, chips |
| `radius/panel` | `24px` | Page intro, list panel, metric tile |
| `radius/modal` | `32px` | Dialog/sheet shell |

### Shadow

| Variable | Value | Usage |
| --- | --- | --- |
| `shadow/panel` | `0 12px 32px rgba(15, 23, 42, 0.08)` | Panels/cards |
| `shadow/action` | `0 10px 22px rgba(79, 70, 229, 0.22)` | Primary action buttons |

### Motion

| Variable | Value | Usage |
| --- | --- | --- |
| `motion/duration/instant` | `100ms` | Minimal feedback |
| `motion/duration/fast` | `180ms` | Route/page item entrance |
| `motion/duration/standard` | `240ms` | Modal/sheet |
| `motion/duration/emphasis` | `340ms` | Long-operation status |
| `motion/easing/standard` | `cubic-bezier(0.22, 1, 0.36, 1)` | Enter/update |
| `motion/easing/exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exit |

Reduced motion rule:

- Replace translate/scale/stagger with opacity-only transitions.
- Disable infinite shimmer/ping animation.
- Keep visible static loading/status copy.

## Components

Create components with variants and states. Names should be stable and implementation-facing.

### `AppShell`

Variants:

- `desktop`
- `mobileDrawerClosed`
- `mobileDrawerOpen`

Required slots:

- Brand
- Grouped navigation
- Header status
- Notification icon
- User menu
- Main content

Navigation groups:

- `Van hanh`: Tong quan, Hoc vien, Phu huynh, Lop hoc, Giao vien, Diem danh, Insight diem danh, Chot diem danh
- `Tai chinh`: Thu tien, Chi tien, Lich su giao dich
- `Bao cao`: Bao cao, Bao cao nang cao, Nhat ky
- `Quan tri`: Mau in, Cai dat, Nguoi dung, Import CSV, Backup, Portal phu huynh, Nhac phi

Do not reintroduce the old duplicate `Thu hoc phi` entry.

### `PageIntro`

Variants:

- `withMetrics`
- `actionsOnly`
- `status`
- `loading`
- `error`
- `empty`

Specs:

- White panel, `radius/panel`.
- Eyebrow uses primary soft surface and uppercase tracking.
- H1 remains compact, not landing-page hero scale.

### `MetricTile`

Variants:

- `indigo`
- `sky`
- `emerald`
- `amber`
- `rose`
- `slate`
- `compact`
- `loading`

Specs:

- Fixed icon block `44x44`.
- Label uppercase, value bold, optional helper.
- Bottom accent progress bar for scan cue.

### `ListPanel`

Variants:

- `table`
- `chart`
- `audit`
- `empty`
- `error`
- `loading`

Specs:

- Used for repeated operational sections, not nested inside other cards.
- Header supports title, description and count chip.

### `DataTable`

Variants:

- `default`
- `selectable`
- `loading`
- `empty`
- `error`
- `largeDataset`

States:

- Sort ascending/descending.
- Page size: all, 500, 100, 50.
- Search refreshing.
- Row disabled/not selectable.

### `Modal`

Variants:

- `form`
- `confirm`
- `longForm`
- `mobileSheet`
- `busy`
- `unsavedChanges`

Requirements:

- Body scrolls inside modal.
- Footer action remains reachable.
- Focus trap visible.
- Close guard for dirty forms.

### `LoadingScene`

Variants:

- `route`
- `auth`
- `table`
- `chart`
- `action`
- `longOperation`
- `reducedMotion`

Must include:

- Clear copy explaining what is loading.
- Visible progress line or pulse.
- `aria-live` / `aria-busy` semantics in implementation notes.

### `StatusChip`

Variants:

- `online`
- `paid`
- `ready`
- `pending`
- `warning`
- `danger`
- `blocked`
- `info`

### `ChartPanel`

Variants:

- `line`
- `bar`
- `donut`
- `heatmap`
- `funnel`
- `distribution`
- `empty`
- `loading`
- `error`

Rules:

- Never mix currency and percent on one unlabeled axis.
- Always show legend/axis labels.
- Empty state must explain the selected filter range.

## Desktop Frames

Create frames at `1440x1024` and `1920x1080` for:

1. `Dashboard / Operations Overview`
2. `Students / List + Edit Modal`
3. `Parents / List + Edit Modal`
4. `Classes / List + Bulk Add Students Modal`
5. `Attendance / Month Navigation + Week Table`
6. `Fee Workbench / Class-Line Collection`
7. `Fee Workbench / Print Queue Modal`
8. `Reports / BI Overview`
9. `Reports / Attendance Detail`
10. `Reports / Tuition Detail`
11. `Reports / Risk Detail`
12. `Template Designer / Canvas + Properties`
13. `Templates / Library`
14. `Admin / Users`
15. `Settings / Center`

## Mobile Frames

Create frames at `390x844` and `768x1024` for:

1. `Mobile / Navigation Drawer`
2. `Mobile / Dashboard`
3. `Mobile / Students List`
4. `Mobile / Class Edit Sheet`
5. `Mobile / Attendance`
6. `Mobile / Fee Workbench`
7. `Mobile / Reports`
8. `Mobile / Template Designer Readjusted`

## Prototype Flows

1. `Login -> Auth Loading -> Dashboard`
2. `Route Click -> RouteLoading -> Loaded Page`
3. `Table Search -> Refreshing -> Filtered Results`
4. `Edit Form -> Dirty Close -> Confirm`
5. `Fee Workbench Select Rows -> Collect Cash -> Print Queue`
6. `Attendance Month Previous/Next -> Week Selection -> Save`
7. `Template Upload Image -> Canvas Updated -> Save`
8. `Reports Tab Filter -> Loading -> Drilldown`

## Implementation Mapping

| Figma Concept | Current Code Reference |
| --- | --- |
| Tokens | `frontend/src/design/tokens.js` |
| Motion | `frontend/src/design/motion.js` |
| App shell | `frontend/src/components/layout/MainLayout.jsx`, `Sidebar.jsx`, `Header.jsx` |
| Page intro/metric/list panel | `frontend/src/components/ui/OperationalPage.jsx` |
| Loading system | `frontend/src/components/ui/LoadingStates.jsx`, `LoadingScene.jsx`, `RouteProgress.jsx`, `LongOperationStatus.jsx`, `AsyncBoundary.jsx` |
| Table | `frontend/src/components/ui/DataTable.jsx` |
| Modal | `frontend/src/components/ui/Modal.jsx` |
| Fee workbench | `frontend/src/pages/FeeCollectionPage.jsx` |
| Reports BI | `frontend/src/pages/ReportsPage.jsx` |
| Template Designer | `frontend/src/pages/TemplateDesignerPage.jsx` |

## Figma Write Checklist

When write-capable Figma MCP is available:

1. Create the page and sections above.
2. Create variables first, then components.
3. Recreate desktop/mobile frames from current production UI, not the stale old Figma frames.
4. Link prototype flows.
5. Run `get_design_context` for every implementation frame.
6. Record node IDs in `plans/2026-06-09-eduflow-motion-ux-stitch-figma/phase-02-figma-source-of-truth.md`.
7. Update `receipts/2026-06-09-eduflow-motion-figma-source-blocked.md` with the unblocked evidence or supersede it with a new receipt.
