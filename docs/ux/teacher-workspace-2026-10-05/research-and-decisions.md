# Research And Decision Record

## Current Problems And Code Evidence

| Evidence | Problem | Response |
| --- | --- | --- |
| `frontend/src/pages/StudentProgressReportPage.jsx`: default current-year range; charts before roster; split roster/selected print panel | Repeated learner-month rows, long scrolling, narrow data table and unrelated inspector | Default one class/month; full-width roster; analytics/print separate tabs |
| Same page: actions navigate to learner detail or print | No direct write workflow | Always-visible typed score cells with row save |
| `frontend/src/components/layout/Sidebar.jsx`: `lg:static` | Desktop sidebar moves with document | Fixed desktop rail, independent navigation scroll, reserved content offset |
| `MainLayout.jsx`: `min-h-screen`, overflowing main without bounded shell | Competing scroll containers | One page-content scroll owner; isolate horizontal roster scroll only |
| `server/api/student-progress/daily.ts`: deleteMany for selected date then createMany | A single-cell partial PUT can erase other evidence | New patch/CAS contract before grid rollout |
| `prisma/schema.prisma`: UserRole admin/receptionist, Teacher is a separate entity | Teacher persona is not a login capability | Existing permission-bearing actors first; teacher identity/scope explicitly gated |
| `lib/settings-registry.ts`, console settings/history and configVersion CAS | Config infrastructure exists but no UI-copy/theme catalog | Extend validated setting keys, not parallel CMS |

## PRD Alignment

| Existing requirement / source | Preserve / planned change |
| --- | --- |
| June12 progress assessment plan: teacher-friendly input; monthly truth; daily evidence; no fabricated scores | Spreadsheet entry improves workflow; overall score never edited directly |
| August10 handoff: academic entry moved out of aggregate report into per-student dashboard | Explicit proposed UX reversal: add safe entry tab at roster level; retain dashboard for depth; requires reviewed write/CAS/auth tests. Do not silently restore old unsafe quick-entry implementation |
| Admin_Console_PRD_Plan.md: tenant-scoped configuration, typed registry, immutable revisions and RBAC | Content console uses these foundations, configVersion and history; release remains gated by actual console readiness |
| TP-1 business contract: null vs zero, manual/daily/proxy sources, comparable trends, frozen finalization | UI consumes canonical DTO. No local calculation/average overrides; daily fallback not silently saved as monthly manual input |
| June09 UX plan: operations-first, no broad glass/performance regressions | Retain data-first controls, Vietnamese date/currency, reduced motion; lightly adapt depth |
| Legacy DESIGN.md: oversized heroes, dark-gradient, parallax | Not adopted in operations grid; propose scoped soft-clay token profile. Do not rewrite historical design doctrine without approval |

## Alternatives: Weighted Trade-Off

Scores 1-5, provisional design judgement, not measured user research. Speed40%, safety25%, density20%, mobile15%.

| Option | Speed | Safety | Density | Mobile | Weighted | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Expand row editor | 3 | 5 | 4 | 5 | 3.95 | Initially recommended; user rejected as primary |
| Always-visible spreadsheet cells, explicit row save | 5 | 4 | 5 | 3 | 4.45 | User selected; primary proposal |
| Auto-save every blur, bulk spreadsheet | 5 | 2 | 5 | 2 | 3.80 | Defer: accidental commits, partial-batch/conflict and connectivity risks |

## Root Cause / Reflection

5 Whys: workflow is slow -> navigation required -> report owns screen -> reporting and input mixed without a roster write contract -> progress grew incrementally around per-student evidence. A palette change alone cannot solve that.

Assumptions verified: report currently lacks write cells; daily PUT replaces a day's entries; there is no teacher UserRole. Logical bridge: roster editing requires new persistence safeguards, not just inputs. Alternative considered: retain report-only and build separate gradebook route; chosen tab preserves existing deep links without a duplicate navigation entry. Confidence high for observed code facts, moderate for untested workflow metrics and proposed clay tokens. Benchmark real teachers before release.

## Sources And Applicability

- [NameThatUI Claymorphism](https://namethatui.com/styles/claymorphism): soft material depth; adapt to key controls, not all table cells. Full puffy aesthetic would fight operational density.
- [NameThatUI element index](https://namethatui.com/): identifies Timeline, Steps, Scrollspy and Progress controls. Names are vocabulary, not a requirement to use every effect.
- [Bento Grid](https://namethatui.com/web/bento-grid): optional overview composition, never the grade-entry roster.
- [Date Picker](https://namethatui.com/web/date-picker): date selector uses civil date strings and existing business timezone.
- [Vibrancy](https://namethatui.com/macos/vibrancy): native AppKit behavior; CSS translucent chrome is only a web approximation, with opaque fallback.
- [Sticky vs Fixed](https://namethatui.com/web/sticky-fixed): distinguish fixed rail from sticky table headers and transformed ancestors.
- [Carbon Common Actions](https://www.carbondesignsystem.com/building-blocks/core/patterns/common-actions/tab-1): predictable save/cancel/error feedback; adopt interaction principles, not a new framework dependency.
- [WAI-ARIA Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/): explicit grid navigation/editing contract; do not add grid role without implementing it.
- [Material Motion](https://m3.material.io/styles/motion): purposeful state transitions, not decorative scroll motion.

Skill search recommended data-dense/drill-down patterns. Its generic hero/features/CTA suggestion and new font imports were rejected as inapplicable to this existing operations app. No dependencies installed.
