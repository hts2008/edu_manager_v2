---
phase: 5
title: "Content and theme console"
status: pending
priority: P1
dependencies: [UXW-01]
---

# Content And Theme Console

## Requirements / Architecture

Tenant known-key copy/theme registry, explicit view/edit privileges, preview/publish/version/history/rollback. Reuse settings service; no parallel CMS or arbitrary HTML/CSS/JS. [Contract](../../docs/ux/teacher-workspace-2026-10-05/content-console.md).

## Related Files

Registry/settings/API/permission catalog, console navigation/editor/history, new experience page and presentation resolver/token adapter. Identify existing token module before CSS changes.

## Test-First Steps

1. Red registry/security tests unknown keys/XSS/placeholders/locale/length/protected labels/contrast and view-only denial.
2. Extend organization setting keys with validated schema; publish CAS and immutable rollback.
3. Safe published response allowlist, tenant+locale+version cache, stale/logout isolation and defaults on failure.
4. Build preview/diff/swatch/density/motion/history UI; integrate grid/sidebar/common feedback first.
5. Apply scoped approved clay tokens; inventory remaining modules without changing frozen print/receipt/business settings.

## Success Criteria

- [ ] Edit/publish/reload without rebuild; other tenant unchanged; conflict retains draft.
- [ ] Long Vietnamese labels/mobile/zoom work; protected domain meaning not falsified.

## Risks

Copy can hide safety state and caches can leak tenants. Validate semantic boundary and published response, not just escaping. Existing console NO-GO remains binding.
