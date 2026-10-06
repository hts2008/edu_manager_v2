---
phase: 2
title: "Safe roster persistence"
status: pending
priority: P1
dependencies: [UXW-01]
---

# Safe Roster Persistence

## Requirements / Architecture

Non-destructive entry PATCH, shared evidence CAS/idempotency, canonical response, tenant/class/grader authorization. Existing daily PUT replaces a date; never send single-cell subsets through it. Dedicated evidenceVersion, not finalized revisionNumber/configVersion.

## Related Files

Proposed modify schema/router/daily/monthly APIs, finalization helpers and actual permission catalog; new patch/version helpers/tests. Migration is designed here but execution needs authorization.

## Test-First Steps

1. Red tests same-day untouched evidence preservation, stale drafts, version0 creation, explicit clear and concurrent finalization.
2. Design non-destructive version-column migration/default/backfill/rehearsal; inventory every mutation consumer.
3. Implement bounded operations/IDs/hash replay, atomic version claim, canonical recompute/activity and safe conflict DTO.
4. Apply protocol to daily PUT/DELETE/monthly/finalize/reopen; review legacy client compatibility so old writers cannot bypass CAS unnoticed.
5. Add batched class roster read matching router conventions; no per-cell/row hydration N+1.
6. Real PG/independent HTTP clients verify grader reassignment/foreign scope/finalize races and persisted readback.

## Success Criteria

- [ ] Unrelated evidence intact; stale409; one version transition/audit; idempotent timeout replay.
- [ ] Frozen snapshots and existing tenant guards preserved; migration/identity scope approved.

## Risks

Cross-module write contract change requires blast-radius inventory and independent adversarial review before enabling grid writes.
