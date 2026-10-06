# Acceptance And Evidence Matrix

All rows below are PLANNED unless explicitly sourced. No implementation/e2e success claim in this docs-only phase. Existing tuition/progress test counts do not certify the new grid.

| ID | Scenario | Required evidence |
| --- | --- | --- |
| UX01 | Choose class/month; one learner row; always-visible scores; no right inspector | Mounted UI + desktop browser screenshot |
| UX02 | Daily vs monthly source selection;0 vs blank; read-only derived score | Unit + HTTP persisted readback + browser |
| UX03 | Multiple same-date assessments; single entry update preserves all others | Real PG/API + in-row evidence browser |
| UX04 | Two sessions edit same evidence, stale CAS denied and draft retained | Independent HTTP clients + browser conflict |
| UX05 | Save/finalize, grader reassignment, period lock interleavings | Controlled concurrent PG/HTTP tests, immutable snapshot |
| UX06 | Double submit/timeout/idempotent replay/conflicting operation hash | HTTP write/audit counts + browser retry state |
| UX07 | Explicit clear vs omitted key; note/practice/shield unaffected | Unit + database assertions |
| UX08 |403/foreign tenant/class/revoked actor; no hidden data | HTTP role/scope matrix, server checks |
| UX09 | Grid navigation/edit modes, labels, focus return, Enter/Escape | Keyboard-only browser + screen-reader manual check |
| UX10 | Context/filter/page change dirty-draft protection; stale response ignored | Mounted component + browser delayed responses |
| UX11 | Fixed rail at scroll0/1000/3000, expanded/collapsed; nav scroll independent | Bounding-box assertions + screenshots1440/1920 |
| UX12 | Drawer focus trap/Escape; no body overflow/mobile inputs | Browser390/768/1024 + zoom200% |
| UX13 | Save updates row/summary/trend without reload, no focus/reorder loss | Browser + authoritative HTTP response assertions |
| UX14 | Offline/failure preserves drafts; config fetch failure uses safe copy | Browser offline/slow/error injection |
| UX15 | Copy edit/publish/reload/rollback and config-version conflict | Real settings PG/API + console browser |
| UX16 | Cross-tenant copy cache, logout and stale request isolation | HTTP + browser two tenant sessions |
| UX17 | XSS/invalid placeholder/unknown key/huge label/theme contrast rejection | Unit security + HTTP validation + long-copy screenshots |
| UX18 | Protected financial/safety/source wording cannot be hidden | Registry/consumer tests + review checklist |
| UX19 | CSV/print/PDF canon/source fidelity; detail deep links retained | Export/PDF parsed content + browser print route |
| UX20 | Reduced motion/transparency; no heavy clay/blur in table | Browser media emulation + performance trace |
| UX21 | Missing class/grader/empty roster/finalized rows | Mounted/UI + HTTP fail-closed |
| UX22 | Existing receipts/fees/attendance/console/navigation regression | Full unit/type/lint/build + bounded real suites |

## Proposed Measurable Gates

- Usability: teacher representative updates four skills for ten students without leaving roster; target<=3minutes and no unintended writes, compare against measured current flow. This is a hypothesis, not current measured improvement.
- Save: UI pending feedback<=100ms; row updates from response without reload. Target p95 authenticated row save<=1s under agreed local/staging dataset/network, record query counts and response size. Do not call local target a production SLA.
- Load: test30/100/500 learner classes; batch roster fetch, no per-cell/per-row hydration N+1. No all-years default fetch. Debounced filtering retains active draft. Consider virtualization only after measured need and keyboard review; no dependency install assumed.
- Visual/a11y: body and data labels contrast>=4.5:1, interactive borders/focus>=3:1, targets>=44px, no document horizontal overflow, no overlaps, Vietnamese glyphs and200% zoom. Scrollable grid overflow is bounded and signposted accessibly.
- Delivery: lint0warnings/typecheck/unit/integration/browser/export/security pass for new slice; independent review of authorization/CAS/settings. Capture exact commits/diffs/logs/screenshots/test counts and not only source-string assertions.
- Rollback: presentation flags switch to old read-only experience without discarding unsaved drafts or erasing new evidence; schema rollback must preserve version columns/history. No destructive down migration to fake rollback.

## Release Boundaries

New UX flag off in production until design/API/identity-scope gates pass. Schema/migration rehearsal and rollout require authorization. Existing security/manual-calculate/history/restore blockers remain in tuition production plan. A successful UX review does not authorize overall GO.
