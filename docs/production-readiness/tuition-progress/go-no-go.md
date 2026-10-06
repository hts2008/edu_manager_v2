# Go / No-Go Evidence Register

## Operational Release Update - 2026-10-06

Canonical https://edu-manager-gules.vercel.app is operational after the authorized production migration and admin bootstrap. Actual authenticated smoke: seven operational APIs200, incorrect password401, missing center400, unknown center401, platform management403. Encrypted cloud backup V4 upload/verification/counts pass. Migration19-chain, verifier28 tables/59 relations/0 failures; protected business records and original user credentials unchanged. Ownership restored; zero freeze triggers/operator roles. Evidence: [release execution](../../../receipts/2026-10-06-go-live-execution.md).

This operational go-live does not certify historical provenance reconstruction, owner signatures, physical-printer acceptance or the future24h observation gate. Historical findings are retained without speculative recalculation. The2026-10-05 register below is historical, not the current runtime deployment status.

Date: 2026-10-05. Candidate: dirty local implementation; immutable release candidate NOT CREATED. Verdict: **NO-GO**.

Current evidence: [execution receipt](../../../receipts/2026-10-05-tuition-progress-execution.md), [captured verification](../../artifacts/tuition-progress-execution-2026-10-05/verification.json). Local corrections are under review, not production/history closure.
This is an execution checklist, not a certification. Documentation task completion does not pass a runtime gate.

## Finding Closure

| Finding | Implementation task | Required evidence | State |
| --- | --- | --- | --- |
| R1 zero extra surcharge | TPR-02 | TP-FIN-01..12; real charge/persistence and protected history | REVIEW: source/HTTP180k fixed; historical disposition pending |
| R2 mixed-source monthly trend | TPR-03 | TP-ACA-01..04,15; correct baseline outside filter | REVIEW: canonical comparable baseline fixed; all layers pending |
| R3 daily/monthly/finalize inconsistency | TPR-03 | TP-ACA-05..10; concurrent real finalize + reload | REVIEW: HTTP/DB finalize/reopen/concurrency passed; historical closure pending |
| R4 cross-skill delta/alerts | TPR-03 | TP-ACA-11..16; no false comparability | REVIEW: composition/calibration regressions pass; owner acceptance pending |
| R5 timeline/PDF settings gap | TPR-04 | TP-CFG-01..05 and TP-UI-04; historical settings | REVIEW: effective/frozen wiring fixed; full visual/export parity pending |

## Gate Register

Every row requires an actual evidence link and owner signature before PASS. If code, migrations, dependency lock or relevant config changes after a gate, invalidate and rerun affected gates on the new immutable candidate.

| Gate | Phase | Acceptance | State / evidence |
| --- | --- | --- | --- |
| G01 Baseline and contract | TPR-01 | Review coverage finished, tracked blockers, owner-approved TP-1 and deployment scope | PARTIAL: fresh local checks; owner signatures/whole review pending |
| G02 Tuition correctness | TPR-02 | R1 closed; rounding, locks, enrollment, makeup, ledger invariants pass | PARTIAL: desired pricing and real ledger checks pass; complete matrix/history pending |
| G03 Academic correctness | TPR-03 | R2-R4 closed, provenance/null/comparability and finalize atomicity pass | PARTIAL: local regression and HTTP/DB pass; full acceptance pending |
| G04 Settings/UI/export parity | TPR-04 | R5 closed, same-scope API/UI/PDF parity, responsive/role/error states pass | PARTIAL: three viewport reloads, PDF HTTP and settings guards; full parity pending |
| G05 History closure | TPR-05 | All anomaly dispositions verified; protected originals preserved; no unresolved wrong balance/score | NOT RUN |
| G06 Real persistence and isolation | TPR-05 | Real handler HTTP/PG/browser checks, independent readback, zero required skips, tenant/auth fail closed | PARTIAL: captured real HTTP/PG/browser proof; remaining matrix/races pending |
| G07 Build and quality | TPR-05 | Typecheck, lint zero warnings, build, unit/frontend, coverage targets and diff-check pass | PARTIAL: static/tests/build pass; all coverage thresholds not yet certified |
| G08 Security | TPR-05 | Dependency/security review clean under approved repo policy; no secrets or exploitable release-blocking risk | FAIL: root undici high and frontend policy brace-expansion high; TPR-SEC-01 |
| G09 Admin Console migration | TPR-05 | Dataful exact-chain Neon rehearsal, schema diff, backfill and session evidence; AC prerequisites satisfied | BLOCKED |
| G10 Backup and recovery | TPR-05 | v4/v3 restore, compatibility matrix and measured rollback/PITR within approved RTO/RPO | NOT RUN |
| G11 Independent predeploy decision | TPR-06 | G01-G10 PASS, actual named reviewer/owners approve immutable candidate and target | BLOCKED |
| G12 Canonical deployment smoke | TPR-06 | Authorized migration/deploy verified; canonical SHA and critical flows correct | NOT RUN |
| G13 Observation and handoff | TPR-06 | 24h + scheduled-cycle evidence, on-call/runbook ready, no integrity incident | NOT RUN |

Predeploy GO requires G01-G11. VERIFIED LIVE additionally requires G12-G13. No waiver may substitute for R1-R5 closure, tenant isolation, ledger/snapshot integrity, target safety, or recoverability. Newly discovered P0/P1 or release-critical P2 issues become explicit blockers with tests; they are not moved to backlog to obtain GO.

## Evidence Quality

- PASS requires command exit status, actual executed/failed/skipped counts and candidate identity. Source-string checks or mocks alone cannot prove persistence.
- Do not reuse historical 530/530, the prior 21 focused tests or wrong-behavior probes as evidence of remediation.
- Pair screenshots with HTTP/database readback; a success toast or nonblank chart alone does not prove correctness.
- Business metric changes require finance/academic sign-off. Security/recovery require an independent reviewer; this planning session is not that review.
- Unknown environment access, missing credentials, skipped tests, stale receipts and unavailable coverage are unresolved gates, not conditional green.

## Sign-Off Record To Populate During Execution

| Field | Value |
| --- | --- |
| Candidate SHA / dependency lock / migration manifest | PENDING |
| TP-1 acceptance and approved changes | PENDING |
| Actual production baseline and target fingerprint | PENDING |
| Finance owner / anomaly manifest acceptance | PENDING |
| Academic owner / scoring and historical revisions acceptance | PENDING |
| QA / full gate evidence index | PENDING |
| Database operator / restore and recovery evidence | PENDING |
| Independent reviewer / release-critical findings | PENDING |
| Release owner / explicit production authorization | PENDING |
| Deployment ID / canonical smoke / observation end | PENDING |
| Final decision, time and rationale | NO-GO: implementation and runtime evidence pending |

Execution ledger: [plan](../../../plans/2026-10-05-tuition-progress-production/plan.md). Operational truth: [KANBAN](../../../KANBAN.md). Existing Admin Console AC-07 remains blocked; do not confuse that board task with the older plan's AC-07 settings work package.
