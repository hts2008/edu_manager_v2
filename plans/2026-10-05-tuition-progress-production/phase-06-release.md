# Phase 06: Authorized Production Release

Task: TPR-06. Priority: P0. Status: BLOCKED.
Depends on: TPR-05 and Admin Console predeploy readiness; NOT on a prior successful production deployment of that same candidate.
Owner: release owner. Required independent reviewer plus finance/academic/database sign-off.
Gates: G11-G13. Tests: TP-OPS-05 and canonical critical smoke.

## Objective

Release only the exact proven candidate, then verify real operation and recovery readiness. Planning approval is not production deployment approval.

## Entry Criteria

- [ ] G01-G10 PASS with current candidate evidence; R1-R5 closed and newly discovered release-critical defects resolved.
- [ ] Actual named sign-offs, explicit target/window authorization and operator access recorded.
- [ ] Fresh target identity, backup/restore availability, config/flag defaults and incident contacts verified.
- [ ] Data cutoff/delta reconciliation and write-freeze/cron-drain procedure approved.

## Work Items

- [ ] TPR-06A: Independent predeploy review; populate [Go/No-Go](../../docs/production-readiness/tuition-progress/go-no-go.md). Any missing hard gate remains NO-GO.
- [ ] TPR-06B: Execute [runbook](../../docs/production-readiness/tuition-progress/release-runbook.md) under operator authorization: freeze, fresh backup, exact rehearsed migrations/app/config steps and approved historical corrections.
- [ ] TPR-06C: Verify canonical candidate/deployment/schema; perform authorized critical business smoke and session/tenant checks before resuming general writes.
- [ ] TPR-06D: Resume traffic/cron once; monitor zero-tolerance integrity signals, availability thresholds and independent reconciliation. Abort/recover using the tested compatibility plan if needed.
- [ ] TPR-06E: Complete >=24h observation and scheduled-cycle evidence, record final metrics and any incidents. Keep UNDER OBSERVATION until the criterion is actually met.
- [ ] TPR-06F: Package release receipt, evidence links, current operations guide, support escalation, correction/recovery procedure and unresolved noncritical backlog. Update board/memory/handoff to evidence-backed status.

## Exit Criteria

- [ ] G11-G13 PASS for exact canonical deployment, not just preview.
- [ ] Fee calculation/payment/ledger and daily/monthly/finalize/reload/PDF correct; no tenant/auth/data regression.
- [ ] No unexplained discrepancy or duplicate operation during observation; backup/recovery remain available.
- [ ] Release owner signs VERIFIED LIVE; independent reviewer confirms evidence. No open release-blocking P0/P1 or critical P2.

## Abort Criteria

Any wrong charge/receipt, altered finalized evidence, tenant leak, auth bypass, unreconciled data mutation or failed migration invariant immediately triggers freeze/escalation. Availability thresholds are defined in the approved runbook. Do not restore over live writes or switch to an incompatible historical app.

No production action is executed by this documentation task. Long observation does not imply unattended monitoring has been scheduled; the release owner must assign and operate it during execution.

## Execution Checkpoint - 2026-10-05

Current execution status: BLOCKED. Original production entry/exit/abort criteria remain unchanged; G11-G13 have not been executed or signed.

- Local implementation/review evidence consists of main-reported focused58/58, HTTP14/14 with zero skips, PostgreSQL18 migration rehearsal, browser daily80/reload3/3 and two stable inventory dry-runs with0 writes. None establishes canonical production identity, history reconciliation or recovery readiness.
- TPR-01 remains PARTIAL awaiting owner approvals/whole review breadth; TPR-02..04 remain REVIEW with local code implemented/full matrix pending; TPR-05 remains PARTIAL local-only with production-derived history/recovery pending. Main captured root533/533 and admin216/216. Frontend125/125 is builder-reported, pending main runner confirmation; receipt links remain with main.
- No production repair, migration, deployment, canary or observation is authorized by this checkpoint. Require the original gates, named sign-offs and explicit production target/window authorization before release work. See the [matrix checkpoint](../../docs/production-readiness/tuition-progress/verification-matrix.md#execution-checkpoint---2026-10-05) for bounded scenario evidence.
