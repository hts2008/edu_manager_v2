---
phase: 4
title: "Always-visible score grid"
status: pending
priority: P1
dependencies: [UXW-02, UXW-03]
---

# Always-Visible Score Grid

## Requirements / Architecture

Explicit row save; authoritative immediate feedback; read-only aggregate; input/overview/report tabs. No right editor/print panel. Preserve detailed learner deep links and source semantics.

## Related Files

Report page, services/api and scoped student-progress grid/row/cell/draft utilities. Reuse DailyProgressEditor normalizers if safe, not its whole-date replacement mutation. Extract small components instead of expanding current report monolith.

## Test-First Steps

1. Mounted tests0/blank, multiple entries, daily vs manual, dirty/error/focus/context switch.
2. Authorized class/month/date toolbar, current-month roster and URL/back/reload state.
3. Always-visible inputs/sticky learner/header, per-row save/status and same-row evidence disclosure.
4. New PATCH/CAS and canonical summary; retain focus/draft, suppress stale responses and re-sort only intentionally.
5. Implement actual accessible keyboard navigation/edit contract and mobile stacked inline inputs.
6. Move charts/print into separate tabs/routes; test detail/export compatibility.

## Success Criteria

- [ ] Ten learners updated without navigation; timing measured, no assumed speedup.
- [ ] Save/error/conflict/offline/finalized/forbidden states pass; server truth visible without reload.

## Risks

Avoid auto-save every key, per-row fetch storms, local blended formulas and fallback values silently saved as manual evidence.
