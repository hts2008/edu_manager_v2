---
phase: 6
title: "Verification and staged rollout"
status: pending
priority: P1
dependencies: [UXW-04, UXW-05]
---

# Verification And Staged Rollout

## Requirements / Architecture

Complete [22-scenario matrix](../../docs/ux/teacher-workspace-2026-10-05/verification-matrix.md), teacher trials and reversible tenant flag pilot. UI flag is not authorization; local pass is not production GO.

## Related Files

Focused unit/mounted/PG/API/e2e tests and existing shell/progress/console/export suites; dedicated logs/screenshots/SHA/design-node mapping; KANBAN/memory/receipt updates.

## Steps

1. Full lint0warnings/type/unit, real PG/API races/scope and mounted/browser desktop1440/1920/tablet768/mobile390; verify CSV/PDF.
2. Keyboard/screen reader/200% zoom/long-copy/reduced-motion/offline/timeout tests, not source regex alone.
3. Measure30/100/500 learner load/query/response counts, p95 saves and teacher task timings against baseline.
4. Independent authorization/CAS/content-cache/publish review; freeze candidate and Figma mapping.
5. Operator-authorized migration/recovery/deploy only after existing tuition security/manual-calculate/history gates pass.
6. Pilot approved tenant; observe conflicts/draft loss/errors/latency before expansion.

## Success Criteria

- [ ]22 scenarios evidenced; measured usability and design parity accepted.
- [ ] Source/formula/history preserved; whole release gates pass and deployment explicitly authorized.

## Risks / Rollback

Restore old read experience via flags without losing active drafts or committed evidence. Retain version/history schema; no destructive down migration. Reconcile uncertain writes before fallback.
