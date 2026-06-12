---
title: "EDU_MANAGER_V2 EduFlow Motion UX/UI Production Track"
status: implemented
priority: P1
created: 2026-06-09
scope: project
execution: "Stitch MCP -> Figma MCP -> React implementation -> browser verification"
blockedBy: []
blocks: []
---

# EDU_MANAGER_V2 EduFlow Motion UX/UI Production Track

## Goal

Nâng toàn bộ giao diện EDU_MANAGER_V2 từ trạng thái không đồng nhất thành một hệ thống quản trị giáo dục production-ready, hiện đại, dễ quét dữ liệu, có motion/loading rõ ràng và không làm giảm hiệu năng.

Mọi thiết kế mới phải đi theo chuỗi bắt buộc:

1. Hiểu codebase và workflow thật.
2. Google Stitch tạo concept/variant bằng `modelId = GEMINI_3_1_PRO`.
3. Figma lưu design system, frame, component, token và prototype làm source of truth.
4. Implement vào React/Vite/Tailwind hiện có.
5. Verify bằng Chrome/Playwright trên desktop/mobile, mạng nhanh/chậm và reduced-motion.

## Planning Verdict

**CAUTION - Proceed with staged rollout.**

Không redesign đồng loạt toàn bộ page trong một lượt. Rủi ro chính là phá workflow vận hành, làm motion nặng thêm tình trạng lag, hoặc để Stitch/Figma/code lệch nhau. Triển khai theo vertical slices, mỗi slice phải có Figma context, code, browser proof và regression test trước khi chuyển sang slice kế tiếp.

## Confirmed Current State

## Status Update - 2026-06-11 Final Closeout

The EduFlow Motion UX/UI production track is implemented. Phase 2 is now closed
after a Figma Desktop plugin pass created native token-bound components and
linked implementation frames: components `49:436`, `49:438`, `49:440`,
`49:442`, `49:444`, desktop frame `49:447`, and mobile frame `49:472`.
Figma MCP verified variable bindings, design context, metadata, and screenshots.
The final acceptance and implementation/deploy mapping are recorded in
`receipts/2026-06-11-uxm02-figma-source-final-closeout.md`.

No new production deploy was run for this final Figma-only closeout because no
runtime React/Tailwind source changed after the Phase 8 production verification.

## Status Update - 2026-06-10

Code-side and production verification phases are implemented. Phase 1 Stitch selection is implemented with a 95/100 acceptance score. Phase 2 is no longer blocked on basic Figma write access because Figma Desktop paste/import created proof node `31:2`, primary renamed source-pack board `35:128`, and coarse native component definition `37:415`. The plan remains in `review` because `37:415` is a single source-pack component wrapper rather than a complete native Figma design system with reusable variables, granular components, linked implementation frames and replaced stale frames.

- Frontend: React 19, React Router, Vite, Tailwind CSS v4, Framer Motion, Recharts, Fabric, Lucide.
- Production: `https://edu-manager-gules.vercel.app`.
- Existing Stitch project: `projects/16803115577660289376`, hiện tập trung vào Report Intelligence Center.
- Existing Figma page: `3:2` - `EDU_MANAGER_V2 Production UX`.
- Existing Figma frames:
  - `3:3` - Design Tokens / Production.
  - `3:36` - Desktop / Receipts Shell.
  - `3:142` - Mobile / Navigation Drawer.
- Current Figma source-pack evidence:
  - `31:2` - first Desktop paste/import proof node.
  - `35:128` - `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack`, verified with `get_metadata`, `get_design_context` and `get_screenshot`.
  - `37:415` - coarse native component definition wrapping the source pack, verified with `get_metadata`, `get_design_context` and `get_screenshot`.
- Figma metadata còn navigation cũ có cả `Thu tiền` và `Thu học phí`; phải sửa trước khi dùng làm source of truth.
- `RouteLoading` hiện chỉ là các khối `animate-pulse`; `PageTransition` chỉ fade 100ms.
- `index.css` đang trộn light EduFlow tokens, dark Stitch tokens, nhiều font family, gradient/glass effects và motion cũ. Đây là design-system drift cần xử lý có kiểm soát.
- Facebook video reference không đọc được qua web fetch công khai. Phase 0 phải mở bằng Chrome phiên đã đăng nhập để ghi lại motion characteristics; nếu link không truy cập được thì dùng nguyên tắc motion đã mô tả trong plan, không chặn tiến độ.

## Product And User Context For Design

### Primary Users

- Lễ tân 22-35 tuổi: thao tác nhanh trong giờ cao điểm, cần bảng dữ liệu rõ, bulk action, trạng thái tức thời.
- Chủ trung tâm 35-55 tuổi: cần số liệu tài chính/chuyên cần dễ hiểu, drilldown và cảnh báo đáng tin cậy.
- Admin: cấu hình lớp, người dùng, mẫu in, backup, audit.

### Product Modules

- Tổng quan vận hành.
- Học viên, phụ huynh, lớp học, giáo viên.
- Điểm danh, insight điểm danh, chốt kỳ.
- Thu tiền học phí theo từng lớp, phiếu thu, chi tiền, lịch sử.
- Báo cáo BI, báo cáo nâng cao.
- Mẫu in và Template Designer.
- Import, users, settings, audit, backup, recycle bin.
- Parent Portal là secondary surface, triển khai sau admin core.

### Design Principles

- Calm Productivity meets Vibrant Energy.
- Operations-first, không biến dashboard thành landing page.
- Data first, chrome last.
- Một màn hình có một nhiệm vụ chính và một primary action.
- Motion phải giải thích trạng thái hoặc quan hệ nhân quả.
- Loading phải nhìn thấy rõ, không để màn hình trắng hoặc blur toàn trang.
- Không dùng animation làm tăng layout shift.
- Không dùng blur/glass diện rộng vì production từng có vấn đề giật/lag.
- Dense but organized: bảng, filter, trạng thái và bulk action phải dễ quét.
- Vietnamese-first: `DD/MM/YYYY`, `1.234.567đ`, `T2...CN`.

## Required Stitch Prompt Contract

Mỗi prompt gửi Stitch phải chứa đủ các phần sau:

1. **Product**: Vietnamese education center operations platform.
2. **Users**: receptionist, center owner, admin.
3. **Workflows**: route/module và hành động thật của màn hình.
4. **Data density**: table/chart/filter/bulk-action requirements.
5. **Visual direction**: EduFlow, premium, youthful but professional.
6. **Motion direction**: clear loading, state continuity, reduced motion.
7. **Responsive constraints**: desktop 1440/1920, tablet 768, mobile 390.
8. **Accessibility**: WCAG AA, keyboard, focus, 44px targets.
9. **Performance**: transform/opacity only, no large blur, no continuous decorative loops.
10. **Output requirements**: loading, empty, error, success, disabled, selected, modal/drawer states.

Mandatory tool parameters:

```json
{
  "modelId": "GEMINI_3_1_PRO",
  "deviceType": "DESKTOP"
}
```

Mobile generation uses the same model and `deviceType = "MOBILE"`.

## Stitch Master Prompt

```text
Design a production-grade Vietnamese education-center operations platform named
EDU_MANAGER_V2 / EduFlow.

Primary users:
- Receptionists working quickly during peak hours.
- Center owners reviewing finance, attendance and risk.
- Admins managing classes, users, templates, audit and backup.

Product modules:
Dashboard; students; parents; classes; teachers; attendance; attendance insights;
attendance closing; class-level tuition collection; receipts; payments; history;
BI reports; advanced reports; print templates; template designer; import; users;
settings; audit logs; backups; recycle bin.

Visual direction:
Calm Productivity meets Vibrant Energy. Use a restrained indigo/violet identity
with cyan accents, neutral slate surfaces, semantic green/amber/rose, Inter-style
high-legibility typography, 4/8px spacing, small-radius operational components,
clear hierarchy, compact professional data density and consistent Lucide-style icons.
Do not create a marketing hero, decorative card nesting, large gradient blobs,
dark glass panels, or oversized typography.

Motion:
Create a coherent loading and transition language. Loading must be unmistakable:
show a stable branded motion indicator plus Vietnamese status text, skeletons that
match the final layout, and progress feedback for long operations. Use transform
and opacity only, 150-300ms micro-interactions, interruptible transitions, no layout
shift, no blocking animation, and a reduced-motion alternative. Avoid a generic
tiny spinner on a blank page.

Required states:
Default, hover, focus, pressed, selected, disabled, loading, refreshing, empty,
error with retry, partial data, success confirmation, modal/drawer, and mobile.

Responsive:
Desktop 1440 and 1920, tablet 768, mobile 390. Preserve data usability: tables may
become priority columns plus detail drawers; filters become a sheet; bulk actions
stay reachable; no horizontal page overflow.

Create an operations UI that is visually premium but faster to understand than
the current test UI. Optimize for repeated daily use and trustworthy finance data.
```

## Core Screen Batches

### Batch A - Global System

- App shell, grouped sidebar, header, route transition.
- Login/auth waiting state.
- Global loading, refreshing, error, empty and offline states.
- Desktop and mobile navigation.

### Batch B - Daily Operations

- Dashboard.
- Students list + edit modal.
- Classes list + long edit modal/bulk student picker.
- Attendance calendar + weekly grid.

### Batch C - Finance And Intelligence

- Fee Workbench with one row per student-class-month.
- Receipt/print queue.
- BI Reports with filters, chart grid, details drawer.
- Advanced Reports.

### Batch D - Power Tools

- Templates list.
- Full-screen Template Designer.
- Import, users, settings, audit, backups.

## Variant Strategy

Generate three variants for Batch A-C:

1. **Calm Operations** - safest density, minimal motion.
2. **Motion Data Command** - stronger state transitions and analytical hierarchy.
3. **Friendly Reception Console** - clearer touch targets and guided bulk workflows.

Selection score:

| Criterion | Weight |
| --- | ---: |
| Workflow usability | 25% |
| Information density and scan speed | 20% |
| Domain fit | 15% |
| Responsive behavior | 15% |
| Accessibility | 10% |
| Motion clarity | 10% |
| Implementation/performance cost | 5% |

Direction with score below 80/100 is rejected. The selected direction must not score below 4/5 on workflow usability or accessibility.

## Figma Source Of Truth Structure

Create or update a dedicated Figma page named:

`EDU_MANAGER_V2 / EduFlow Motion v3`

Required sections:

1. `00 Foundations`
2. `01 Color and Type Tokens`
3. `02 Motion Tokens`
4. `03 Loading System`
5. `04 Components`
6. `05 Desktop Shell`
7. `06 Mobile Shell`
8. `07 Dashboard`
9. `08 Master Data`
10. `09 Attendance`
11. `10 Finance`
12. `11 Reports`
13. `12 Template Designer`
14. `13 Admin`
15. `14 Prototypes`

Each implemented frame must expose its Figma node ID in the execution receipt. Before code implementation, use Figma `get_design_context` for that exact node. A screenshot alone is not sufficient.

## Motion And Loading Architecture

### Loading Taxonomy

| Situation | UX Pattern | Rule |
| --- | --- | --- |
| Route chunk loading | Shell-preserving route skeleton + branded progress line | Never blank the whole app |
| Initial page data | Layout-matched skeleton | Show after 250-300ms |
| Background refresh | Keep stale data + compact refresh indicator | Do not replace content with skeleton |
| Table fetch/filter | Header stays stable + row skeletons | Preserve column widths |
| Chart fetch | Chart frame + axes/legend skeleton | No fake zero charts |
| Button action | Inline spinner + action label | Disable duplicate submit |
| PDF/print | Step status: prepare -> render -> open | Show retry/download fallback |
| Upload/template save | Determinate progress where available | Keep canvas visible |
| Long operation >8s | Status message, elapsed hint, retry/cancel | Never loop silently |
| Error | Stop animation and show cause + recovery | No endless spinner |

### Motion Tokens

- `motion.instant`: 80-120ms.
- `motion.fast`: 150-180ms.
- `motion.standard`: 220-260ms.
- `motion.emphasis`: 300-380ms.
- Enter: ease-out.
- Exit: 60-70% of enter duration.
- Stagger: 30-40ms, maximum 6 visible items.
- Press: scale 0.98.
- Page transition: opacity + translateY 4-8px, no blur.
- Reduced motion: opacity-only or immediate state change.

### Proposed Components

- `MotionProvider`
- `RouteProgress`
- `RouteLoadingScene`
- `AsyncBoundary`
- `PageSkeleton`
- `TableSkeleton`
- `ChartSkeleton`
- `MetricSkeleton`
- `InlineSpinner`
- `ActionProgressButton`
- `RefreshingBadge`
- `LongOperationStatus`

No new animation dependency is planned. Use the existing Framer Motion package.

## Phase Index

| Phase | File | Outcome |
| --- | --- | --- |
| 0 | `phase-00-baseline-browser-motion-study.md` | Baseline screenshots, video/motion notes, UX inventory |
| 1 | `phase-01-stitch-exploration.md` | Stitch variants using Gemini 3.1 Pro |
| 2 | `phase-02-figma-source-of-truth.md` | REVIEW: Figma Desktop source-pack node `35:128` exists; native tokens/components/frames still pending |
| 3 | `phase-03-design-system-loading-motion.md` | IMPLEMENTED: code-level tokens, loading/motion primitives, async action states, browser proof |
| 4 | `phase-04-shell-master-data.md` | IMPLEMENTED: shell/master-data/dashboard/login/modal local and production smoke complete |
| 5 | `phase-05-attendance-finance-reports.md` | High-risk operational workflows |
| 6 | `phase-06-template-admin-parent.md` | Designer/admin/secondary surfaces |
| 7 | `phase-07-responsive-accessibility-performance.md` | Mobile, a11y, performance hardening |
| 8 | `phase-08-production-verification-closeout.md` | Full gates, deploy, evidence, KANBAN/memory |

## Agent Orchestration

The lead agent owns Stitch/Figma coordination, design selection, shared architecture and final verification.

### Explorer Agents

- **UX inventory explorer**: routes, states, current inconsistencies.
- **Motion/performance explorer**: loading gaps, repaint/blur/animation risks.
- **Accessibility explorer**: keyboard, focus, contrast, reduced motion.
- **Design QA explorer**: compare Stitch, Figma and implementation.

### Worker Agents

- **Worker A - Design system**: tokens, motion/loading primitives.
- **Worker B - Shell/master data**: layout/sidebar/header/dashboard/CRUD.
- **Worker C - Attendance/finance**: attendance and fee workflows.
- **Worker D - Reports**: chart/dashboard/report details.
- **Worker E - Template/admin**: Template Designer and admin screens.
- **Worker F - QA**: Playwright specs, visual evidence, performance scripts.

Workers receive disjoint file ownership. The lead integrates shared files such as `index.css`, `App.jsx`, `MainLayout.jsx`, `DataTable.jsx`, and `Modal.jsx` to avoid merge conflicts.

All completed agents must be closed before the final response.

## Autoresearch Loop

`ck:autoresearch` is used only for measurable UX/performance gates, not subjective aesthetics.

Planned optimization metrics:

- Console/page errors: target `0`.
- Failed API requests during smoke: target `0` excluding intentional 401/403 probes.
- Horizontal page overflow: target `0px`.
- CLS: target `<0.1`.
- Route blank-content duration: target `0ms`; shell remains visible.
- Input/press visual feedback: target `<100ms`.
- Warm route transition to meaningful state: target `<600ms` locally.
- Animation frame budget: transform/opacity only; no recurring long tasks caused by motion.
- Reduced-motion test pass: `100%`.
- Targeted Playwright suites: `100%` pass.

Each iteration makes one atomic change, runs the focused guard test, keeps improvements and discards regressions.

## Quality Gates

### Static

```powershell
npx tsc --noEmit
npm --prefix frontend run lint -- --max-warnings=0
npm run test:unit
npm run build
git diff --check
```

### Browser

- Chrome desktop: 1440x900 and 1920x1080.
- Tablet: 768x1024.
- Mobile: 390x844.
- Normal network and throttled network.
- `prefers-reduced-motion: reduce`.
- Keyboard-only navigation.
- No horizontal overflow.
- No text clipping or overlapping.
- No console errors, page errors or unexpected 4xx/5xx.

### Existing Regression Suites

- `frontend/e2e/ux-redesign-smoke.spec.js`
- `frontend/e2e/phase-b-smoke.spec.js`
- `frontend/e2e/report-bi.spec.js`
- `frontend/e2e/template-designer-hardening.spec.js`
- `frontend/e2e/fee-workbench-line-split.spec.js`

### New Suites

- `frontend/e2e/eduflow-motion-system.spec.js`
- `frontend/e2e/loading-states.spec.js`
- `frontend/e2e/responsive-visual.spec.js`
- `frontend/e2e/reduced-motion.spec.js`

## Acceptance Criteria

- Stitch screens were generated with recorded project/screen IDs and `GEMINI_3_1_PRO`.
- The chosen direction has a documented selection score.
- Figma contains current tokens, components, loading states, desktop/mobile frames and prototypes.
- Figma navigation matches the current app; no duplicate stale finance menu.
- Every implemented screen was preceded by `get_design_context` for its frame.
- App shell never disappears during route/data loading.
- Users can distinguish loading, refreshing, empty, error and success states.
- Motion remains smooth and does not reintroduce production lag.
- All primary admin routes are visually consistent.
- Attendance, finance, reports and Template Designer retain functional regression coverage.
- Desktop/mobile/reduced-motion browser verification passes.
- Production smoke passes after deploy.
- KANBAN, activeContext, progress, decisionLog, current-session and receipt are synchronized.

## Explicit Non-Goals

- No backend business-rule redesign in this track unless a UI change exposes a confirmed contract defect.
- No database migration for visual changes.
- No SMS/Zalo provider activation.
- No framework migration.
- No replacement of Fabric or Recharts unless a separate architecture decision is approved.
- No decorative motion that blocks actions or hides slow API behavior.

## Risks And Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Broad redesign breaks daily workflows | High | Vertical slices, browser tests before next slice |
| Motion worsens lag | High | Transform/opacity only, no large blur, perf budget |
| Stitch produces marketing-like UI | High | Operations prompt, density rubric, reject score <80 |
| Figma and code drift | High | Node IDs, `get_design_context`, screenshot comparison |
| Loading masks errors forever | High | Timeout/error transition, no endless spinner |
| Financial/attendance semantics are altered | High | Preserve contracts, existing E2E, functional review |
| Mobile tables become unusable | Medium | Priority columns + detail drawer, no whole-page horizontal scroll |
| Existing dirty worktree is mixed into UX commits | Medium | Explicit path staging, separate commits and receipts |
| Native Figma design-system completion remains partial | Medium | Keep Phase 2 in REVIEW; do not claim source-of-truth sync until reusable variables, granular components/variants, linked frames and corrected navigation are verified |
| Facebook video cannot be opened | Low | Capture via logged-in Chrome; otherwise use documented motion principles |

## Completion Rule

The track is not complete when Stitch images exist or when code builds. It is complete only when:

`Stitch evidence + Figma source of truth + implementation + browser proof + production smoke + project-control writeback`
