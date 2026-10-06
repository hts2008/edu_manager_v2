---
phase: 3
title: "Fixed collapsible shell"
status: pending
priority: P1
dependencies: [UXW-01]
---

# Fixed Collapsible Shell

## Requirements / Architecture

Fixed desktop240/72px rail, independent nav scrolling, reserved main offset, one vertical content scroll owner; mobile drawer with focus management. No competing ConsoleLayout rail.

## Related Files

MainLayout.jsx, Sidebar.jsx, Header.jsx, shell CSS/motion; inspect ConsoleLayout and all permission-filtered routes. Preference keys tenant+actor, no sensitive local drafts.

## Test-First Steps

1. Red browser test current rail bounds at scroll1000.
2. Implement fixed rail/main owner/sticky header positions; remove transformed containing-block conflicts.
3. Collapse toggle labels/aria-expanded/tooltips; preserve active route and permissions.
4. Drawer focus trap/Escape/return focus; long-copy/zoom and safe-area checks.

## Success Criteria

- [ ] Stable rail at scroll0/1000/3000; own scroll independent.
- [ ]1440/1920 desktop,390/768/1024 responsive and200% zoom pass; no overlap/double scroll.

## Risks

Shared shell affects every route. No animated width changes during active input; broad navigation regression required.
