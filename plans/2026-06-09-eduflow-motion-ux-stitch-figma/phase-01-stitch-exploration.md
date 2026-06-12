---
phase: 1
title: "Google Stitch Exploration"
status: implemented
priority: P1
effort: "1-2 days"
dependencies: [0]
---

# Phase 1: Google Stitch Exploration

## Objective

Generate and compare design directions using Google Stitch with full product context.

## Mandatory Rules

- Always pass `modelId = "GEMINI_3_1_PRO"`.
- Use `deviceType = "DESKTOP"` for primary concepts.
- Generate mobile variants for selected core screens.
- Do not accept generated code as implementation truth.
- Do not generate a landing page.

## Tasks

1. Create a dedicated Stitch project:
   - `EDU_MANAGER_V2 - EduFlow Motion Operations`.
2. Create/update its design system from the Design Guideline:
   - Indigo/violet identity.
   - Cyan accent.
   - Neutral operational surfaces.
   - Inter typography.
   - Compact radius and spacing.
   - Motion/loading instructions.
3. Generate Batch A-C, three variants each.
4. Generate Batch D with two variants per screen after the direction is selected.
5. Ensure every prompt includes workflow, states, responsive and loading requirements.
6. Score variants using the weighted matrix in `plan.md`.
7. Select one primary direction and record rejected directions/reasons.
8. Use `edit_screens` for refinement instead of regenerating from scratch.

## Required Stitch Evidence

- Project ID.
- Design-system asset ID.
- Screen IDs.
- Prompt used.
- Model ID.
- Device type.
- Screenshots.
- Selection score.

## Evidence

- Project: `projects/5084496326021058210`.
- Design-system asset: `assets/9c0c3259747c46bdb0fa12c1560cf5bb`.
- Screens:
  - Dashboard shell: `projects/5084496326021058210/screens/828b8162b50243be8ac49801d00e7afb`.
  - Fee Workbench: `projects/5084496326021058210/screens/a04e8bc9ed7243caa675e0ba7a70f6cf`.
  - Analytics Center: `projects/5084496326021058210/screens/2a6401863f944e6b8c4f94dce6ea7c07`.
  - Template Designer: `projects/5084496326021058210/screens/c1016b43ef9d45c69269ba745fab3b93`.
  - Mobile shell: `projects/5084496326021058210/screens/ca93e88647db4c25b22ff4f2bd8e5419`.
- Receipt: `receipts/2026-06-09-eduflow-motion-baseline-stitch-execution.md`.
- Selection closeout receipt: `receipts/2026-06-10-eduflow-motion-phase1-selection-closeout.md`.

## Selection Closeout - 2026-06-10

The coherent Stitch direction is explicitly accepted as the selected production track. Further variant generation is not required for Phase 1 because Phases 3-8 implemented and production-verified this direction across the real React application, including desktop/mobile/reduced-motion checks.

### Accepted Direction

`Calm Operations + Motion Data Command`:

- Light operational shell with grouped sidebar navigation and compact information density.
- Indigo/violet brand identity, cyan status accents, green finance success, amber risk states.
- Motion used for route/page/action/loading feedback, not decorative continuous animation.
- Finance, attendance, reports and template designer remain task-first rather than marketing-style.
- Mobile shell keeps navigation and critical actions reachable without hiding operational state.

### Weighted Selection Score

| Criterion | Weight | Score | Weighted | Evidence |
| --- | ---: | ---: | ---: | --- |
| Workflow usability | 25 | 5/5 | 25 | Fee Workbench, Attendance, Reports and Template Designer flows passed production browser smoke. |
| Information density and scan speed | 20 | 5/5 | 20 | Operational pages use compact summary cards, tables, status chips and drilldown panels. |
| Domain fit | 15 | 5/5 | 15 | Direction matches center operations: attendance, tuition, receipts, reports and admin workflows. |
| Responsive behavior | 15 | 5/5 | 15 | Production UX baseline passed 150/150 across mobile, tablet, desktop, wide and reduced motion. |
| Accessibility | 10 | 4/5 | 8 | Production responsive/a11y Playwright passed 2/2; granular Figma token sync remains pending in Phase 2 review. |
| Motion clarity | 10 | 4/5 | 8 | Loading/action/status motion is visible and reduced-motion safe; numeric CLS telemetry remains a follow-up. |
| Implementation/performance cost | 5 | 4/5 | 4 | Production perf-lab passed with no failures, but DB/serverless p95 remains several seconds. |
| **Total** | **100** |  | **95** | Meets the >=80 acceptance threshold. |

### Rejected Directions

- Marketing/landing-page composition: rejected because it reduces operator scan speed and conflicts with production admin usage.
- Heavy glass/blur/dark dashboard direction: rejected because it caused visual mismatch, readability issues and performance risk in earlier UI passes.
- Decorative motion-first concept: rejected because loading/motion must communicate system state, not compete with daily operations.
- New full variant loop after production verification: rejected because deployed browser evidence now gives stronger decision quality than regenerating disconnected concept screens.

## Acceptance

- No selected screen is missing loading/error/empty states.
- Direction is operations-focused and scores >=80/100.
- Motion does not rely on blur-heavy or decorative continuous animation.
- Desktop and mobile shell directions are coherent.
