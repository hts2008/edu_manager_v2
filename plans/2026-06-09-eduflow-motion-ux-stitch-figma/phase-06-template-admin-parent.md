---
phase: 6
title: "Template Designer, Admin And Parent Portal"
status: implemented
priority: P2
effort: "4-6 days"
dependencies: [5]
---

# Phase 6: Template Designer, Admin And Parent Portal

## Implementation Status

Implemented locally on 2026-06-10.

Evidence:

- `receipts/2026-06-10-eduflow-motion-phase6-template-admin-parent.md`
- `docs/artifacts/ux-baseline/local-phase6-template-admin-parent-reduced/2026-06-10T05-54-51-997Z/baseline-matrix.md`
- `docs/artifacts/playwright/phase6-admin-secondary-local/`
- `docs/artifacts/playwright/phase6-template-local/`

Verification:

- `npm --prefix frontend run lint -- --max-warnings=0`
- `npx tsc --noEmit`
- `npm run test:unit` 61/61
- `npm run build`
- Playwright `admin-secondary-phase6.spec.js` 2/2
- Playwright `template-designer-hardening.spec.js` 1/1
- UX baseline 100/100 default/reduced-motion scenarios

## Objective

Apply the system to power-user and secondary surfaces after the core operator workflows are stable.

## Template Designer

- Preserve Fabric canvas visibility fixes.
- Preserve A4/A5/A6/custom/thermal sizing and alignment.
- Redesign toolbar, layers, properties, zoom and status areas.
- Add clear canvas-initializing, upload, save and error states.
- Keep canvas visible during upload/save.
- Add keyboard shortcuts only when discoverable through tooltips/menu.
- Verify visible pixel deltas, not only object count.

## Admin

- Users.
- Settings.
- Import.
- Audit logs.
- Backup.
- Recycle bin.
- Fee reminders.

Normalize:

- Status and risk messaging.
- Destructive confirmations.
- Progress for import/backup.
- Empty/error/retry states.

## Parent Portal

- Apply lighter brand alignment.
- Keep workflows simple and read-only.
- Mobile-first.
- Do not expose admin navigation patterns.

## Acceptance

- Template Designer remains functionally complete.
- Admin long operations expose progress and recovery.
- Parent portal is responsive and visually related without inheriting admin density.
